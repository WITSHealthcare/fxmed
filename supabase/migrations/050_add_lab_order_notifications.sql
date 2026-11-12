-- Patients are told in their portal when their care team requests lab tests,
-- and that notification opens the portal's Lab results section, where they
-- download the request form. Lists the invoice values from migration 051 too,
-- so the two can run in either order. Safe to run more than once.
BEGIN;

ALTER TABLE public.patient_portal_notifications DROP CONSTRAINT IF EXISTS patient_portal_notifications_kind_check;
ALTER TABLE public.patient_portal_notifications ADD CONSTRAINT patient_portal_notifications_kind_check
  CHECK (kind IN ('message','document','care_plan','appointment','form','lab_order','invoice'));

ALTER TABLE public.patient_portal_notifications DROP CONSTRAINT IF EXISTS patient_portal_notifications_section_check;
ALTER TABLE public.patient_portal_notifications ADD CONSTRAINT patient_portal_notifications_section_check
  CHECK (section IN ('overview','care_plan','documents','messages','forms','lab_results','billing'));

COMMIT;
