-- Allow finalized and amended clinical notes to be edited.
--
-- Previously protect_final_clinical_note() blocked any change to content,
-- note_type, patient_id or encounter_id once a note reached 'final' or
-- 'amended', forcing corrections through the amendment flow.
--
-- Editing is now permitted. The prior version of the note is captured in
-- emr_audit_logs by the application before each update, so the history of what
-- a note said remains reconstructable even though the row itself is mutable.

DROP TRIGGER IF EXISTS protect_final_clinical_note_trigger ON public.emr_clinical_notes;
DROP FUNCTION IF EXISTS public.protect_final_clinical_note();
