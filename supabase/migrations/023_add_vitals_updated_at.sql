-- emr_vitals was the only clinical table without updated_at, so it could not go
-- through the shared update path (which stamps updated_at on every write) and
-- vital signs could not be corrected after entry.

ALTER TABLE public.emr_vitals
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
