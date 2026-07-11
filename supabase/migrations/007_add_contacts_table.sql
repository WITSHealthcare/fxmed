-- Outreach contacts: basic details + biodata captured at outreach events.
-- Inserted by the public /register page (via the API route using the service
-- role key) and managed in the admin "Contacts" tab.

CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic details
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,

  -- Biodata
  gender TEXT,
  date_of_birth DATE,
  marital_status TEXT,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,

  -- Health snapshot (vitals are typically measured by staff at the outreach)
  health_concern TEXT,
  conditions TEXT,
  medications TEXT,
  blood_pressure TEXT,   -- e.g. "120/80"
  blood_sugar TEXT,      -- e.g. "5.6 mmol/L" or "100 mg/dL"

  -- Outreach context
  outreach_event TEXT,

  -- Admin workflow
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'enrolled', 'archived')),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_outreach_event ON contacts(outreach_event);

-- Enable RLS. No public policies are defined: all access goes through the API
-- route using the service role key, which bypasses RLS. This keeps the PII /
-- health data locked down from direct anon/public access.
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on change.
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();
