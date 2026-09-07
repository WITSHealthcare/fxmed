-- Records how far a visitor got after submitting the functional health
-- analysis form. Until now the only stored state was `status`, which is the
-- admin's own workflow (new/reviewed/contacted/completed) and says nothing
-- about what the visitor actually did.
--
-- Shape is a flat object of step name to ISO timestamp, for example:
--   {"investigations_viewed_at": "2026-09-07T10:04:11.000Z"}
-- The form submission itself is not stored here; submitted_at already records it.

ALTER TABLE public.emr_health_assessments
  ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '{}'::jsonb;
