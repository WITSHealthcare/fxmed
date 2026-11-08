-- Standalone survey and quiz forms, independent of training. Each form has one
-- audience:
--   customers  anyone with the public link /forms/<slug>; optional contact details
--   staff      dashboard users, by role and/or email, filled in the admin portal
--   patients   patient portal users, all or by email, filled in the portal
-- The questions use the same JSON model as training lesson forms (lib/forms.ts).
-- Every read and write goes through validated server routes using the service
-- role, so RLS stays closed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  audience text NOT NULL CHECK (audience IN ('customers', 'staff', 'patients')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  -- customers: whether to ask for name, email and phone
  collect_contact text NOT NULL DEFAULT 'optional' CHECK (collect_contact IN ('none', 'optional', 'required')),
  -- staff and patients: one editable response per person, or a new one each time
  one_response_per_person boolean NOT NULL DEFAULT true,
  -- staff: roles that can fill the form; empty with no emails means every role
  audience_roles text[] NOT NULL DEFAULT '{}',
  -- staff and patients: specific people by email; for patients, empty means every portal patient
  assigned_emails text[] NOT NULL DEFAULT '{}',
  confirmation_message text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  respondent_type text NOT NULL CHECK (respondent_type IN ('public', 'staff', 'patient')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  score integer CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  passed boolean,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forms_status_idx ON public.forms(audience, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS form_responses_form_idx ON public.form_responses(form_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS form_responses_user_idx ON public.form_responses(user_id, form_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS form_responses_patient_idx ON public.form_responses(patient_id, form_id) WHERE patient_id IS NOT NULL;

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.forms FROM anon, authenticated;
REVOKE ALL ON public.form_responses FROM anon, authenticated;

DROP TRIGGER IF EXISTS forms_updated_at ON public.forms;
CREATE TRIGGER forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

-- As with every other website form (migrations 031 and 032), a customer who
-- leaves an email or phone number becomes a contact, written once and never
-- rewritten so staff notes on the contact are kept.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS form_response_id uuid REFERENCES public.form_responses(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_form_response_idx ON public.contacts(form_response_id);

CREATE OR REPLACE FUNCTION public.mirror_form_response_to_contact() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.respondent_type = 'public' AND (nullif(trim(NEW.contact_email), '') IS NOT NULL OR nullif(trim(NEW.contact_phone), '') IS NOT NULL) THEN
    INSERT INTO public.contacts (form_response_id, full_name, phone, email, outreach_event, status, created_at)
    SELECT NEW.id, coalesce(nullif(trim(NEW.contact_name), ''), 'Website visitor'),
      nullif(trim(NEW.contact_phone), ''), nullif(trim(NEW.contact_email), ''),
      left('Form: ' || f.title, 200), 'new', NEW.submitted_at
    FROM public.forms f WHERE f.id = NEW.form_id
    ON CONFLICT (form_response_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS form_responses_mirror_contact ON public.form_responses;
CREATE TRIGGER form_responses_mirror_contact AFTER INSERT ON public.form_responses FOR EACH ROW EXECUTE FUNCTION public.mirror_form_response_to_contact();

COMMIT;
