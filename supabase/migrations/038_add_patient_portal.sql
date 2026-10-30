-- Patient portal. Patient accounts are regular Supabase Auth users tagged with
-- app_metadata.account_type = 'patient' and linked one-to-one to an EMR
-- patient. They are never admin dashboard roles. Every read and write goes
-- through validated server routes using the service role, so RLS stays closed.

CREATE TABLE IF NOT EXISTS public.patient_portal_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL UNIQUE REFERENCES public.emr_patients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Documents: the clinic chooses what a patient can see, and patients can
-- upload their own records for the team to review.
ALTER TABLE public.emr_documents ADD COLUMN IF NOT EXISTS shared_with_patient boolean NOT NULL DEFAULT false;
ALTER TABLE public.emr_documents ADD COLUMN IF NOT EXISTS shared_at timestamptz;
ALTER TABLE public.emr_documents ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'clinic' CHECK (source IN ('clinic','patient'));
-- Only patient uploads carry a review state; 'new' raises a clinic notification.
ALTER TABLE public.emr_documents ADD COLUMN IF NOT EXISTS portal_status text CHECK (portal_status IS NULL OR portal_status IN ('new','reviewed'));
ALTER TABLE public.emr_documents ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.emr_documents ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE INDEX IF NOT EXISTS emr_documents_portal_status_idx ON public.emr_documents(portal_status, created_at DESC) WHERE portal_status IS NOT NULL;

-- Care plans: shared plans appear in the portal, where patients tick off steps.
ALTER TABLE public.emr_care_plans ADD COLUMN IF NOT EXISTS shared_with_patient boolean NOT NULL DEFAULT false;
ALTER TABLE public.emr_care_plans ADD COLUMN IF NOT EXISTS shared_at timestamptz;
ALTER TABLE public.emr_care_plan_items ADD COLUMN IF NOT EXISTS completed_by_patient boolean NOT NULL DEFAULT false;

-- Secure messages between a patient and the care team. `status` is the
-- recipient's read state, so unread patient messages drive the clinic bell.
CREATE TABLE IF NOT EXISTS public.patient_portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('patient','clinic')),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text CHECK (sender_name IS NULL OR char_length(sender_name) <= 160),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_portal_messages_patient_idx ON public.patient_portal_messages(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS patient_portal_messages_unread_idx ON public.patient_portal_messages(sender, status, created_at DESC);

-- What the patient sees in their own notification list.
CREATE TABLE IF NOT EXISTS public.patient_portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('message','document','care_plan')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  detail text CHECK (detail IS NULL OR char_length(detail) <= 600),
  section text NOT NULL DEFAULT 'overview' CHECK (section IN ('overview','care_plan','documents','messages')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_portal_notifications_patient_idx ON public.patient_portal_notifications(patient_id, created_at DESC);

ALTER TABLE public.patient_portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_portal_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_patient_portal_accounts_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS patient_portal_accounts_updated_at ON public.patient_portal_accounts;
CREATE TRIGGER patient_portal_accounts_updated_at BEFORE UPDATE ON public.patient_portal_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_patient_portal_accounts_updated_at();
