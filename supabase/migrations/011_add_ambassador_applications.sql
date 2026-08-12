-- Ambassador Program applications submitted by the public application form and
-- reviewed through the existing role-protected admin dashboard.

CREATE TABLE IF NOT EXISTS public.ambassador_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  last_name TEXT NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) <= 254),
  phone TEXT NOT NULL CHECK (char_length(phone) <= 40),
  gender TEXT NOT NULL
    CHECK (gender IN ('Female', 'Male', 'Non-binary', 'Prefer not to say')),
  state_region TEXT NOT NULL CHECK (char_length(state_region) <= 120),
  city TEXT NOT NULL CHECK (char_length(city) <= 120),
  organization TEXT CHECK (char_length(organization) <= 160),
  job_title TEXT CHECK (char_length(job_title) <= 120),
  field_of_expertise TEXT NOT NULL CHECK (char_length(field_of_expertise) <= 160),
  motivation TEXT NOT NULL CHECK (char_length(motivation) <= 1600),
  consent BOOLEAN NOT NULL CHECK (consent = true),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ambassador_applications_email_unique
  ON public.ambassador_applications (lower(email));
CREATE INDEX IF NOT EXISTS ambassador_applications_status_idx
  ON public.ambassador_applications (status);
CREATE INDEX IF NOT EXISTS ambassador_applications_created_at_idx
  ON public.ambassador_applications (created_at DESC);

ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies are intentional. Public submission and authorized
-- admin access go through server API routes using the service-role credential.

CREATE OR REPLACE FUNCTION update_ambassador_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ambassador_applications_updated_at ON public.ambassador_applications;
CREATE TRIGGER ambassador_applications_updated_at
  BEFORE UPDATE ON public.ambassador_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_ambassador_applications_updated_at();
