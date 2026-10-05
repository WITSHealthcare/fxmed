-- Patient-form submissions belong in both the clinical review queue and
-- Contacts. Keep these writes in the same transaction: an unsuccessful contact
-- insert must not leave a registration that appears to have saved everywhere.
BEGIN;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS patient_registration_id uuid
    REFERENCES public.emr_patient_registration_requests(id) ON DELETE SET NULL;

-- Deduplicate by submission, not phone/email: family members may share contact
-- details. Reapplying the backfill never overwrites staff notes or statuses.
CREATE UNIQUE INDEX IF NOT EXISTS contacts_patient_registration_idx
  ON public.contacts(patient_registration_id);

CREATE OR REPLACE FUNCTION public.mirror_patient_registration_to_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source = 'public_form' THEN
    INSERT INTO public.contacts (
      patient_registration_id, full_name, phone, email, gender, date_of_birth,
      marital_status, address, city, state, outreach_event, status, created_at
    ) VALUES (
      NEW.id, concat_ws(' ', NEW.first_name, nullif(NEW.middle_name, ''), NEW.last_name),
      NEW.phone, NEW.email, NEW.sex, NEW.date_of_birth,
      NEW.marital_status, NEW.address, NEW.city, NEW.state, 'Patient registration',
      CASE
        WHEN NEW.status IN ('approved', 'linked') THEN 'enrolled'
        WHEN NEW.status = 'rejected' THEN 'archived'
        ELSE 'new'
      END,
      NEW.submitted_at
    ) ON CONFLICT (patient_registration_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mirror_patient_registration_to_contact()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS patient_registration_contact_insert
  ON public.emr_patient_registration_requests;
CREATE TRIGGER patient_registration_contact_insert
  AFTER INSERT ON public.emr_patient_registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.mirror_patient_registration_to_contact();

INSERT INTO public.contacts (
  patient_registration_id, full_name, phone, email, gender, date_of_birth,
  marital_status, address, city, state, outreach_event, status, created_at
)
SELECT
  id, concat_ws(' ', first_name, nullif(middle_name, ''), last_name),
  phone, email, sex, date_of_birth,
  marital_status, address, city, state, 'Patient registration',
  CASE
    WHEN status IN ('approved', 'linked') THEN 'enrolled'
    WHEN status = 'rejected' THEN 'archived'
    ELSE 'new'
  END,
  submitted_at
FROM public.emr_patient_registration_requests
WHERE source = 'public_form'
ON CONFLICT (patient_registration_id) DO NOTHING;

COMMIT;
