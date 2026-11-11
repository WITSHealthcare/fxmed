-- Fixes book_outreach_follow_up from 044: appointments requires email, phone
-- and address, so booking failed for attendees who gave no email. Missing
-- values are now stored as empty text.
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
