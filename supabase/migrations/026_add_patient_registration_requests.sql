-- Public patient registrations are staged here for clinical review. They do
-- not enter the canonical EMR or receive an MRN until explicitly approved.

CREATE TABLE IF NOT EXISTS public.emr_patient_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  sex text NOT NULL CHECK (sex IN ('female','male','intersex','unknown')),
  phone text NOT NULL,
  email text,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'Nigeria',
  marital_status text,
  occupation text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  consent_confirmed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'public_form' CHECK (source IN ('public_form','appointment_booking')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','linked','correction_requested','rejected')),
  linked_patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CREATE TABLE IF NOT EXISTS does not add columns when an older version of
-- this table is already present, so keep incremental upgrades idempotent.
ALTER TABLE public.emr_patient_registration_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'public_form';

DO $$ BEGIN
  ALTER TABLE public.emr_patient_registration_requests
    ADD CONSTRAINT emr_patient_registration_source_check
    CHECK (source IN ('public_form','appointment_booking'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS emr_patient_registration_status_idx
  ON public.emr_patient_registration_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS emr_patient_registration_phone_idx
  ON public.emr_patient_registration_requests(phone);
CREATE INDEX IF NOT EXISTS emr_patient_registration_email_idx
  ON public.emr_patient_registration_requests(lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.emr_patient_registration_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.approve_emr_patient_registration(request_id uuid, reviewer_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  registration public.emr_patient_registration_requests%ROWTYPE;
  patient_id uuid;
BEGIN
  SELECT * INTO registration
    FROM public.emr_patient_registration_requests
   WHERE id = request_id
   FOR UPDATE;

  IF registration.id IS NULL THEN RAISE EXCEPTION 'Registration request not found'; END IF;
  IF registration.status NOT IN ('pending','correction_requested') THEN RAISE EXCEPTION 'Registration request has already been reviewed'; END IF;

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
  ) RETURNING id INTO patient_id;

  UPDATE public.emr_patient_registration_requests
     SET status = 'approved', linked_patient_id = patient_id,
         reviewed_by = reviewer_id, reviewed_at = now(), updated_at = now()
   WHERE id = request_id;

  RETURN patient_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_emr_patient_registration(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_emr_patient_registration(uuid, uuid) TO service_role;
