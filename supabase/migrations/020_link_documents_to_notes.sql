-- Allow clinical documents to be attached to a specific clinical note, not just
-- to a patient or encounter. ON DELETE SET NULL so removing a note never
-- silently destroys the uploaded file record.

ALTER TABLE public.emr_documents
  ADD COLUMN IF NOT EXISTS note_id uuid REFERENCES public.emr_clinical_notes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS emr_documents_note_idx
  ON public.emr_documents(note_id) WHERE note_id IS NOT NULL;
