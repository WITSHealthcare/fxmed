-- Investigation orders and their results, tracked as one record.
--
-- An investigation request form is the order. Placing one now leaves it
-- awaiting results, and it stays on the patient's Results tab until a results
-- report is saved against it. The lab's own report can be uploaded to the
-- order; the FXMed results report is generated from the values read from it,
-- or typed in by hand.
BEGIN;

ALTER TABLE public.investigation_forms
  ADD COLUMN IF NOT EXISTS emr_patient_id uuid
    REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  -- Forms made before this migration keep a null status: whether their
  -- results came back was never recorded, so they are not shown as awaiting.
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('awaiting_results','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.investigation_forms ALTER COLUMN status SET DEFAULT 'awaiting_results';

ALTER TABLE public.investigation_results
  ADD COLUMN IF NOT EXISTS investigation_form_id uuid
    REFERENCES public.investigation_forms(id) ON DELETE SET NULL;

-- The lab's original report, uploaded against the order it answers.
ALTER TABLE public.emr_documents
  ADD COLUMN IF NOT EXISTS investigation_form_id uuid
    REFERENCES public.investigation_forms(id) ON DELETE SET NULL;

-- Forms and reports made from a patient record already carry the patient's
-- EMR id in their JSON. Copy it into the column so they can be found by
-- patient. Reports linked by hand keep the link they have.
UPDATE public.investigation_forms AS form
SET emr_patient_id = patient.id
FROM public.emr_patients AS patient
WHERE form.emr_patient_id IS NULL
  AND form.patient->>'emrPatientId' = patient.id::text;

UPDATE public.investigation_results AS report
SET emr_patient_id = patient.id
FROM public.emr_patients AS patient
WHERE report.emr_patient_id IS NULL
  AND report.patient->>'emrPatientId' = patient.id::text;

CREATE INDEX IF NOT EXISTS idx_investigation_forms_patient
  ON public.investigation_forms(emr_patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigation_forms_awaiting
  ON public.investigation_forms(created_at)
  WHERE status = 'awaiting_results';
CREATE INDEX IF NOT EXISTS idx_investigation_results_patient
  ON public.investigation_results(emr_patient_id, created_at DESC);
-- One results report per order: later results for the same order are added
-- to it, so the order has a single report to download.
CREATE UNIQUE INDEX IF NOT EXISTS idx_investigation_results_form
  ON public.investigation_results(investigation_form_id)
  WHERE investigation_form_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS emr_documents_investigation_form_idx
  ON public.emr_documents(investigation_form_id);

COMMIT;
