-- Functional medicine lab analyses.
--
-- A clinician enters a patient's lab results (typed, or read from an uploaded
-- lab report), each result is compared against both the laboratory's range and
-- the functional-medicine optimal range, and an interpreted report is issued.
-- The results and the interpretation are kept as JSON so the analysis can be
-- reopened, edited and re-issued. Linking to an EMR patient is optional: a
-- report can be prepared for someone who is not yet registered.
BEGIN;

CREATE TABLE IF NOT EXISTS public.fm_lab_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emr_patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  patient jsonb NOT NULL DEFAULT '{}'::jsonb,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  narrative jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fm_lab_analyses_patient_idx ON public.fm_lab_analyses (emr_patient_id);
CREATE INDEX IF NOT EXISTS fm_lab_analyses_updated_idx ON public.fm_lab_analyses (updated_at DESC);

-- Read and written only through the admin API with the service role.
ALTER TABLE public.fm_lab_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fm_lab_analyses FROM anon, authenticated;

COMMIT;
