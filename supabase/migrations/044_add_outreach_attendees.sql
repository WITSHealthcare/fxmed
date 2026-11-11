-- Medical outreach workflow. Attendees register themselves on a customer form
-- marked as an outreach form; each response joins the EMR Outreaches list,
-- where a health worker logs vital signs and signs off. Attendees are not EMR
-- patients (no MRN) until staff book a follow-up, which creates or links the
-- patient, copies the vitals and intake into the chart and books the
-- appointment, all in one transaction (book_outreach_follow_up).
-- Every read and write goes through validated server routes using the service
-- role, so RLS stays closed.
BEGIN;

ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS outreach boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.emr_outreach_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  form_response_id uuid NOT NULL UNIQUE REFERENCES public.form_responses(id) ON DELETE CASCADE,
  -- Who they are, copied from the response so staff can correct it before booking.
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  date_of_birth date,
  sex text CHECK (sex IS NULL OR sex IN ('female', 'male', 'intersex', 'unknown')),
  address text,
  status text NOT NULL DEFAULT 'awaiting_vitals' CHECK (status IN ('awaiting_vitals', 'signed_off', 'booked', 'no_follow_up', 'left')),
  -- Vital signs, in the EMR's units; blood glucose keeps the unit it was measured in.
  systolic_bp integer CHECK (systolic_bp IS NULL OR systolic_bp BETWEEN 40 AND 300),
  diastolic_bp integer CHECK (diastolic_bp IS NULL OR diastolic_bp BETWEEN 20 AND 200),
  heart_rate integer CHECK (heart_rate IS NULL OR heart_rate BETWEEN 20 AND 250),
  temperature_c numeric(4,1) CHECK (temperature_c IS NULL OR temperature_c BETWEEN 30 AND 45),
  spo2 integer CHECK (spo2 IS NULL OR spo2 BETWEEN 50 AND 100),
  weight_kg numeric(5,1) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 1 AND 400),
  height_cm numeric(5,1) CHECK (height_cm IS NULL OR height_cm BETWEEN 30 AND 250),
  waist_cm numeric(5,1) CHECK (waist_cm IS NULL OR waist_cm BETWEEN 20 AND 250),
  bmi numeric(5,1),
  blood_glucose numeric(6,1) CHECK (blood_glucose IS NULL OR blood_glucose > 0),
  glucose_unit text NOT NULL DEFAULT 'mg/dL' CHECK (glucose_unit IN ('mg/dL', 'mmol/L')),
  glucose_timing text CHECK (glucose_timing IS NULL OR glucose_timing IN ('fasting', 'random')),
  vitals_notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz,
  signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_at timestamptz,
  patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  promoted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emr_outreach_attendees_form_idx ON public.emr_outreach_attendees(form_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS emr_outreach_attendees_phone_idx ON public.emr_outreach_attendees(phone);

ALTER TABLE public.emr_outreach_attendees ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emr_outreach_attendees FROM anon, authenticated;

DROP TRIGGER IF EXISTS emr_outreach_attendees_updated_at ON public.emr_outreach_attendees;
CREATE TRIGGER emr_outreach_attendees_updated_at BEFORE UPDATE ON public.emr_outreach_attendees FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

-- The answer to the question an outreach form maps to a patient detail
-- (question.patientField in lib/forms.ts), or null.
CREATE OR REPLACE FUNCTION public.outreach_answer(definition jsonb, answers jsonb, field text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(trim(answers ->> (q ->> 'id')), '')
    FROM jsonb_array_elements(coalesce(definition -> 'questions', '[]'::jsonb)) AS q
   WHERE q ->> 'patientField' = field
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.add_outreach_attendee(response public.form_responses) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  form public.forms%ROWTYPE;
  dob text; sex_answer text;
BEGIN
  SELECT * INTO form FROM public.forms WHERE id = response.form_id;
  IF form.id IS NULL OR NOT form.outreach OR response.respondent_type <> 'public' THEN RETURN; END IF;
  dob := public.outreach_answer(form.definition, response.answers, 'date_of_birth');
  sex_answer := lower(public.outreach_answer(form.definition, response.answers, 'sex'));
  INSERT INTO public.emr_outreach_attendees (form_id, form_response_id, full_name, phone, email, date_of_birth, sex, address, created_at)
  VALUES (
    form.id, response.id, coalesce(nullif(trim(response.contact_name), ''), ''),
    nullif(trim(response.contact_phone), ''), nullif(trim(response.contact_email), ''),
    CASE WHEN dob ~ '^\d{4}-\d{2}-\d{2}$' THEN dob::date END,
    CASE WHEN sex_answer IN ('female', 'male') THEN sex_answer WHEN sex_answer IS NOT NULL THEN 'unknown' END,
    public.outreach_answer(form.definition, response.answers, 'address'),
    response.submitted_at
  )
  ON CONFLICT (form_response_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.form_response_to_outreach() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.add_outreach_attendee(NEW);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS form_responses_outreach ON public.form_responses;
CREATE TRIGGER form_responses_outreach AFTER INSERT ON public.form_responses FOR EACH ROW EXECUTE FUNCTION public.form_response_to_outreach();

-- Turning a form into an outreach form brings in the responses it already has.
CREATE OR REPLACE FUNCTION public.form_outreach_backfill() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.outreach AND NOT coalesce(OLD.outreach, false) THEN
    PERFORM public.add_outreach_attendee(r) FROM public.form_responses r WHERE r.form_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS forms_outreach_backfill ON public.forms;
CREATE TRIGGER forms_outreach_backfill AFTER UPDATE OF outreach ON public.forms FOR EACH ROW EXECUTE FUNCTION public.form_outreach_backfill();

-- Booking a follow-up: link or create the patient, copy the outreach vitals and
-- intake note into the chart, book the appointment and mark the attendee
-- booked. Glucose is stored in the EMR in mg/dL (mmol/L x 18).
CREATE OR REPLACE FUNCTION public.book_outreach_follow_up(
  p_attendee_id uuid, p_actor_id uuid, p_link_patient_id uuid,
  p_first_name text, p_last_name text, p_date_of_birth date, p_sex text,
  p_consultation_type text, p_appointment_date date, p_appointment_time text,
  p_concern text, p_intake_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  attendee public.emr_outreach_attendees%ROWTYPE;
  form_title text; contact uuid; patient uuid; appointment uuid; created boolean := false;
BEGIN
  SELECT * INTO attendee FROM public.emr_outreach_attendees WHERE id = p_attendee_id FOR UPDATE;
  IF attendee.id IS NULL THEN RAISE EXCEPTION 'Outreach attendee not found'; END IF;
  IF attendee.status = 'booked' THEN RAISE EXCEPTION 'This attendee already has a follow-up booked'; END IF;
  IF attendee.signed_at IS NULL THEN RAISE EXCEPTION 'Sign off the vital signs before booking a follow-up'; END IF;
  IF p_consultation_type NOT IN ('home-visit', 'telemedicine') THEN RAISE EXCEPTION 'Choose a home visit or telehealth'; END IF;
  SELECT title INTO form_title FROM public.forms WHERE id = attendee.form_id;
  SELECT id INTO contact FROM public.contacts WHERE form_response_id = attendee.form_response_id;

  IF p_link_patient_id IS NOT NULL THEN
    SELECT id INTO patient FROM public.emr_patients WHERE id = p_link_patient_id;
    IF patient IS NULL THEN RAISE EXCEPTION 'Patient to link not found'; END IF;
  ELSE
    IF nullif(trim(p_first_name), '') IS NULL OR nullif(trim(p_last_name), '') IS NULL THEN RAISE EXCEPTION 'First and last name are required'; END IF;
    IF p_date_of_birth IS NULL THEN RAISE EXCEPTION 'Date of birth is required'; END IF;
    INSERT INTO public.emr_patients (first_name, last_name, date_of_birth, sex, phone, email, address, status, created_by, contact_id)
    VALUES (trim(p_first_name), trim(p_last_name), p_date_of_birth, coalesce(p_sex, 'unknown'), attendee.phone, attendee.email, attendee.address, 'active', p_actor_id,
      CASE WHEN contact IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.emr_patients WHERE contact_id = contact) THEN contact END)
    RETURNING id INTO patient;
    created := true;
  END IF;

  IF attendee.systolic_bp IS NOT NULL OR attendee.heart_rate IS NOT NULL OR attendee.weight_kg IS NOT NULL OR attendee.blood_glucose IS NOT NULL THEN
    INSERT INTO public.emr_vitals (patient_id, systolic_bp, diastolic_bp, heart_rate, temperature_c, spo2, weight_kg, height_cm, bmi, blood_glucose, notes, recorded_by, recorded_at)
    VALUES (patient, attendee.systolic_bp, attendee.diastolic_bp, attendee.heart_rate, attendee.temperature_c, attendee.spo2, attendee.weight_kg, attendee.height_cm, attendee.bmi,
      CASE WHEN attendee.glucose_unit = 'mmol/L' THEN round(attendee.blood_glucose * 18) ELSE attendee.blood_glucose END,
      concat_ws(' ', 'Recorded at outreach: ' || coalesce(form_title, 'medical outreach') || '.',
        CASE WHEN attendee.glucose_timing IS NOT NULL THEN initcap(attendee.glucose_timing) || ' blood glucose' || CASE WHEN attendee.glucose_unit = 'mmol/L' THEN ' (' || attendee.blood_glucose || ' mmol/L).' ELSE '.' END END,
        CASE WHEN attendee.waist_cm IS NOT NULL THEN 'Waist ' || attendee.waist_cm || ' cm.' END,
        attendee.vitals_notes),
      coalesce(attendee.recorded_by, attendee.signed_by), coalesce(attendee.recorded_at, attendee.signed_at));
  END IF;

  IF nullif(trim(p_intake_note), '') IS NOT NULL THEN
    INSERT INTO public.emr_clinical_notes (patient_id, author_id, note_type, content, status, finalized_at)
    VALUES (patient, coalesce(attendee.signed_by, p_actor_id), 'nursing', p_intake_note, 'final', now());
  END IF;

  INSERT INTO public.appointments (first_name, last_name, email, phone, home_address, consultation_type, preferred_date, preferred_time, symptoms, status, payment_status, patient_id)
  -- appointments requires email, phone and address; an attendee may have given none of them.
  SELECT p.first_name, p.last_name, coalesce(attendee.email, p.email, ''), coalesce(attendee.phone, p.phone, ''), coalesce(attendee.address, p.address, ''),
    p_consultation_type, p_appointment_date, p_appointment_time, left(p_concern, 3000), 'confirmed', 'pending', p.id
    FROM public.emr_patients p WHERE p.id = patient
  RETURNING id INTO appointment;

  UPDATE public.emr_outreach_attendees
     SET status = 'booked', patient_id = patient, appointment_id = appointment, promoted_by = p_actor_id, promoted_at = now()
   WHERE id = attendee.id;

  RETURN jsonb_build_object('patient_id', patient, 'appointment_id', appointment, 'created_patient', created);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.book_outreach_follow_up(uuid, uuid, uuid, text, text, date, text, text, date, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_outreach_follow_up(uuid, uuid, uuid, text, text, date, text, text, date, text, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.add_outreach_attendee(public.form_responses) FROM PUBLIC, anon, authenticated;

COMMIT;
