-- Shared patient investigation-result reports generated from Admin Tools.
CREATE TABLE IF NOT EXISTS investigation_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_name TEXT NOT NULL,
  download_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  document_base64 TEXT NOT NULL,
  patient JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_results_created_at ON investigation_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigation_results_created_by ON investigation_results(created_by);
ALTER TABLE investigation_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_investigation_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS investigation_results_updated_at ON investigation_results;
CREATE TRIGGER investigation_results_updated_at
  BEFORE UPDATE ON investigation_results
  FOR EACH ROW EXECUTE FUNCTION update_investigation_results_updated_at();
