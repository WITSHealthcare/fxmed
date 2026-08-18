-- Careers job openings. Content is managed from the admin dashboard by the
-- admin role through validated server routes using the service role; the
-- public careers page reads published openings anonymously.

CREATE TABLE IF NOT EXISTS public.career_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  department TEXT NOT NULL DEFAULT 'Clinical'
    CHECK (department IN ('Clinical', 'Operations', 'Marketing', 'Technology', 'Finance')),
  location TEXT NOT NULL CHECK (char_length(location) BETWEEN 1 AND 160),
  employment_type TEXT NOT NULL DEFAULT 'Full-time'
    CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship', 'Locum')),
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 600),
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  apply_email TEXT CHECK (apply_email IS NULL OR char_length(apply_email) <= 254),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS career_openings_public_idx
  ON public.career_openings(status, sort_order, created_at DESC);

ALTER TABLE public.career_openings ENABLE ROW LEVEL SECURITY;

-- Only published openings are visible to the public site. Every write goes
-- through the authorized admin API with the service role, which bypasses RLS.
DROP POLICY IF EXISTS "Public can view published career openings" ON public.career_openings;
CREATE POLICY "Public can view published career openings"
  ON public.career_openings FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE OR REPLACE FUNCTION update_career_openings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS career_openings_updated_at ON public.career_openings;
CREATE TRIGGER career_openings_updated_at
  BEFORE UPDATE ON public.career_openings
  FOR EACH ROW EXECUTE FUNCTION update_career_openings_updated_at();
