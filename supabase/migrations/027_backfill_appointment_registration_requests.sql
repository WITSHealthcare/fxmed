-- Surface historical appointment bookings in the EMR registration queue.
-- Older booking forms did not collect DOB or sex, so those fields remain
-- incomplete until a clinical team member supplies them during review.

ALTER TABLE public.emr_patient_registration_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'public_form';

DO $$ BEGIN
  ALTER TABLE public.emr_patient_registration_requests
    ADD CONSTRAINT emr_patient_registration_source_check
    CHECK (source IN ('public_form','appointment_booking'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.emr_patient_registration_requests
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN sex DROP NOT NULL;

ALTER TABLE public.emr_patient_registration_requests
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS emr_patient_registration_appointment_idx
  ON public.emr_patient_registration_requests(appointment_id)
  WHERE appointment_id IS NOT NULL;

INSERT INTO public.emr_patient_registration_requests (
  first_name, last_name, date_of_birth, sex, phone, email, address, country,
  consent_confirmed, source, status, appointment_id, submitted_at, updated_at
)
SELECT DISTINCT ON (coalesce(nullif(lower(trim(a.email)), ''), nullif(trim(a.phone), ''), a.id::text))
  coalesce(nullif(trim(a.first_name), ''), 'Unknown'),
  coalesce(nullif(trim(a.last_name), ''), 'Unknown'),
  NULL,
  NULL,
  coalesce(nullif(trim(a.phone), ''), 'Not provided'),
  nullif(lower(trim(a.email)), ''),
  nullif(trim(a.home_address), ''),
  'Nigeria',
  false,
  'appointment_booking',
  'pending',
  a.id,
  coalesce(a.created_at, now()),
  now()
FROM public.appointments a
WHERE a.patient_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.emr_patient_registration_requests r
    WHERE r.appointment_id = a.id
       OR (nullif(trim(a.phone), '') IS NOT NULL AND r.phone = trim(a.phone))
       OR (nullif(trim(a.email), '') IS NOT NULL AND lower(r.email) = lower(trim(a.email)))
  )
ORDER BY coalesce(nullif(lower(trim(a.email)), ''), nullif(trim(a.phone), ''), a.id::text), a.created_at DESC;

CREATE OR REPLACE FUNCTION public.approve_emr_patient_registration(request_id uuid, reviewer_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  registration public.emr_patient_registration_requests%ROWTYPE;
  new_patient_id uuid;
BEGIN
  SELECT * INTO registration
    FROM public.emr_patient_registration_requests
   WHERE id = request_id
   FOR UPDATE;

  IF registration.id IS NULL THEN RAISE EXCEPTION 'Registration request not found'; END IF;
  IF registration.status NOT IN ('pending','correction_requested') THEN RAISE EXCEPTION 'Registration request has already been reviewed'; END IF;
  IF registration.date_of_birth IS NULL OR registration.sex IS NULL THEN
    RAISE EXCEPTION 'Date of birth and sex must be completed before approval';
  END IF;

  INSERT INTO public.emr_patients (
    first_name, middle_name, last_name, date_of_birth, sex, phone, email,
    address, city, state, country, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone,
    emergency_contact_relationship, created_by
  ) VALUES (
    registration.first_name, registration.middle_name, registration.last_name,
    registration.date_of_birth, registration.sex, registration.phone,
    registration.email, registration.address, registration.city,
    registration.state, registration.country, registration.marital_status,
    registration.occupation, registration.emergency_contact_name,
    registration.emergency_contact_phone,
    registration.emergency_contact_relationship, reviewer_id
  ) RETURNING id INTO new_patient_id;

  UPDATE public.emr_patient_registration_requests
     SET status = 'approved', linked_patient_id = new_patient_id,
         reviewed_by = reviewer_id, reviewed_at = now(), updated_at = now()
   WHERE id = request_id;

  IF registration.appointment_id IS NOT NULL THEN
    UPDATE public.appointments SET patient_id = new_patient_id, updated_at = now()
     WHERE id = registration.appointment_id;
  END IF;

  RETURN new_patient_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_emr_patient_registration(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_emr_patient_registration(uuid, uuid) TO service_role;
