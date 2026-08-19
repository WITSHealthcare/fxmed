-- Add 'nutrition' to the permitted clinical note types.
-- The original constraint was declared inline, so Postgres named it
-- emr_clinical_notes_note_type_check.

ALTER TABLE public.emr_clinical_notes
  DROP CONSTRAINT IF EXISTS emr_clinical_notes_note_type_check;

ALTER TABLE public.emr_clinical_notes
  ADD CONSTRAINT emr_clinical_notes_note_type_check
  CHECK (note_type IN ('consultation','progress','nursing','nutrition','procedure','discharge','follow_up'));
