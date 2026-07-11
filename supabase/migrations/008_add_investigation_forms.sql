-- Shared investigation request forms generated from Admin Tools.
-- Stores both the rendered PDF and the structured form data so every dashboard
-- user with Tools access can download, duplicate, and create new forms from the
-- same database-backed history instead of per-browser storage.

CREATE TABLE IF NOT EXISTS investigation_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  original_name TEXT NOT NULL,
  download_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  document_base64 TEXT NOT NULL,

  patient JSONB NOT NULL DEFAULT '{}'::jsonb,
  panel_title TEXT NOT NULL DEFAULT 'Core Functional Medicine Panel',
  tests JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_by UUID,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_forms_created_at ON investigation_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigation_forms_created_by ON investigation_forms(created_by);

ALTER TABLE investigation_forms ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_investigation_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS investigation_forms_updated_at ON investigation_forms;
CREATE TRIGGER investigation_forms_updated_at
  BEFORE UPDATE ON investigation_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_investigation_forms_updated_at();
