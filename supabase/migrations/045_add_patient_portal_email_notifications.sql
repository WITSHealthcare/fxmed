-- Email for patient portal notifications. Notifications are only for patients
-- invited to the portal who have finished setting up their account; each one
-- is also emailed to them, unless they turn emails off in their portal. Emails
-- say only that something changed, never what: email is not a secure channel
-- for health details. Appointment updates (booked, confirmed, cancelled) and
-- form notifications join messages, documents and care plans.
BEGIN;

-- The patient's choice, on by default.
ALTER TABLE public.patient_portal_accounts
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;

-- When a notification was emailed, so a burst of changes sends one email.
ALTER TABLE public.patient_portal_notifications
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

ALTER TABLE public.patient_portal_notifications DROP CONSTRAINT IF EXISTS patient_portal_notifications_kind_check;
ALTER TABLE public.patient_portal_notifications ADD CONSTRAINT patient_portal_notifications_kind_check
  CHECK (kind IN ('message','document','care_plan','appointment','form'));

-- The portal also has a Forms section.
ALTER TABLE public.patient_portal_notifications DROP CONSTRAINT IF EXISTS patient_portal_notifications_section_check;
ALTER TABLE public.patient_portal_notifications ADD CONSTRAINT patient_portal_notifications_section_check
  CHECK (section IN ('overview','care_plan','documents','messages','forms'));

COMMIT;
