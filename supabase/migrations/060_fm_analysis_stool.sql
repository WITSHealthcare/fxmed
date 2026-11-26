-- Stool testing in the Functional Health Analysis.
--
-- A patient's stool test (GI-MAP to start) is kept with their FM lab analysis,
-- beside the blood results: { lab, collectedAt, accession, entries[] }, each
-- entry read against the laboratory's own printed reference (lib/stoolMarkers.ts).
-- Null when the analysis has no stool test. See docs/gi-map-module-plan.md.
BEGIN;

ALTER TABLE public.fm_lab_analyses ADD COLUMN IF NOT EXISTS stool jsonb;

COMMIT;
