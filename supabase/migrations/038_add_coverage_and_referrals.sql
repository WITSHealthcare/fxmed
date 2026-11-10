-- Health insurance coverage and structured referrals.
--
-- Coverage: a patient's NHIA, state-scheme or HMO cover, with the enrollee
-- number, the scheme and the facility they are registered with. Eligibility is
-- checked with the HMO or scheme before an insured service is given, and every
-- check is kept in emr_coverage_verifications, which cannot be edited, so the
-- clinic can show who confirmed cover, how, and when.
--
-- Referrals: a patient sent on to secondary, tertiary or specialist care.
-- Each one records where they were sent, why, how urgently and under which
-- authorisation code, and is tracked until the receiving facility's feedback
-- comes back, so referral completion can be reported.
BEGIN;

CREATE TABLE IF NOT EXISTS public.emr_patient_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  scheme text NOT NULL CHECK (scheme IN ('nhia_formal','bhcpf','vgf','state_scheme','private_hmo','other')),
  -- The scheme's own name, for example Ilera Eko, or the HMO's plan name.
  scheme_name text,
  enrollee_id text NOT NULL,
  hmo_name text,
  -- The primary care facility the enrollee is registered with.
  primary_facility text,
  benefit_package text,
  membership_type text NOT NULL DEFAULT 'principal' CHECK (membership_type IN ('principal','spouse','child','other_dependant')),
  principal_enrollee_id text,
  coverage_start date,
  coverage_end date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  -- The latest eligibility check, copied from emr_coverage_verifications.
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified','not_eligible','unable_to_verify')),
  last_verified_at timestamptz,
  last_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT emr_patient_coverage_dates CHECK (coverage_end IS NULL OR coverage_start IS NULL OR coverage_end >= coverage_start)
);

CREATE INDEX IF NOT EXISTS emr_patient_coverage_patient_idx ON public.emr_patient_coverage(patient_id, status, created_at DESC);
-- An enrollee number belongs to one person. Two active patient records
-- holding the same one is a duplicate record or a misused card.
CREATE UNIQUE INDEX IF NOT EXISTS emr_patient_coverage_active_enrollee_idx
  ON public.emr_patient_coverage(scheme, upper(enrollee_id)) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.emr_coverage_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_id uuid NOT NULL REFERENCES public.emr_patient_coverage(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (outcome IN ('verified','not_eligible','unable_to_verify')),
  method text NOT NULL CHECK (method IN ('hmo_portal','hmo_phone','scheme_portal','card_and_id_sighted','other')),
  -- The HMO's or scheme's reference for the check, when one is given.
  reference text,
  notes text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emr_coverage_verifications_coverage_idx ON public.emr_coverage_verifications(coverage_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS emr_coverage_verifications_patient_idx ON public.emr_coverage_verifications(patient_id, verified_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_coverage_verification_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Coverage verifications cannot be changed; record a new check instead.';
END;
$$;

DROP TRIGGER IF EXISTS protect_coverage_verifications ON public.emr_coverage_verifications;
CREATE TRIGGER protect_coverage_verifications
  BEFORE UPDATE OR DELETE ON public.emr_coverage_verifications
  FOR EACH ROW EXECUTE FUNCTION public.prevent_coverage_verification_changes();

CREATE TABLE IF NOT EXISTS public.emr_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_number text NOT NULL UNIQUE DEFAULT ('REF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  -- The cover the referral is made under; null for a self-paying patient.
  coverage_id uuid REFERENCES public.emr_patient_coverage(id) ON DELETE SET NULL,
  referring_provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_level text NOT NULL DEFAULT 'secondary' CHECK (referral_level IN ('secondary','tertiary','specialist','diagnostic','other')),
  urgency text NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine','urgent','emergency')),
  receiving_facility text NOT NULL,
  receiving_specialty text,
  receiving_contact text,
  reason text NOT NULL,
  clinical_summary text,
  provisional_diagnosis text,
  icd10_code text,
  investigations_summary text,
  treatment_given text,
  -- The HMO or scheme's authorisation for the referral, where one is needed.
  authorization_status text NOT NULL DEFAULT 'not_required' CHECK (authorization_status IN ('not_required','requested','approved','denied')),
  authorization_code text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','attended','completed','declined','cancelled','lost_to_follow_up')),
  -- When the patient is expected to have been seen, for chasing.
  expected_by date,
  sent_at timestamptz,
  accepted_at timestamptz,
  attended_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  -- Why a referral ended without the patient being seen.
  closed_reason text,
  -- The receiving facility's feedback (counter-referral).
  feedback text,
  feedback_received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emr_referrals_patient_idx ON public.emr_referrals(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS emr_referrals_open_idx ON public.emr_referrals(expected_by)
  WHERE status IN ('sent','accepted','attended');
CREATE INDEX IF NOT EXISTS emr_referrals_created_idx ON public.emr_referrals(created_at DESC);

-- Each sent referral raises a follow-up to confirm the patient was seen.
ALTER TABLE public.emr_clinical_tasks
  ADD COLUMN IF NOT EXISTS referral_id uuid REFERENCES public.emr_referrals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS emr_clinical_tasks_referral_idx ON public.emr_clinical_tasks(referral_id);

-- Read and written only through the server routes, as in 016 and 018.
ALTER TABLE public.emr_patient_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_coverage_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emr_patient_coverage FROM anon, authenticated;
REVOKE ALL ON public.emr_coverage_verifications FROM anon, authenticated;
REVOKE ALL ON public.emr_referrals FROM anon, authenticated;

COMMIT;
