-- Recruiting gaps on top of 041 (docs/hr/recruiting-process.md and
-- hiring-plan.md). Server-managed like the rest of HR: RLS on, no browser
-- policies, all access through /api/admin/hr/recruiting and /api/careers/apply.

-- Stage 0 "Requisition approved": role, band, panel and scorecard agreed and
-- approved (MD for every role, plus the Medical Director for clinical roles)
-- before the opening is published. Applications to the linked opening pick up
-- the role family and hiring manager from here.
CREATE TABLE IF NOT EXISTS public.hr_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Hiring-plan role ID (R01..R13, L01, T01); null for roles outside the plan.
  role_code text CHECK (role_code IS NULL OR role_code ~ '^[RLT][0-9]{2}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  department text NOT NULL CHECK (department IN ('Clinical', 'Operations', 'Marketing', 'Technology', 'Finance')),
  employment_type text NOT NULL DEFAULT 'Full-time'
    CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship', 'Locum')),
  role_family text NOT NULL CHECK (role_family IN ('A', 'B', 'C', 'D', 'E', 'F')),
  band_code text CHECK (band_code IS NULL OR char_length(band_code) <= 20),
  headcount integer NOT NULL DEFAULT 1 CHECK (headcount BETWEEN 1 AND 20),
  plan_year integer CHECK (plan_year IS NULL OR plan_year BETWEEN 2020 AND 2100),
  career_opening_id uuid REFERENCES public.career_openings(id) ON DELETE SET NULL,
  hiring_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  panel_user_ids uuid[] NOT NULL DEFAULT '{}',
  trigger_evidence text NOT NULL DEFAULT '' CHECK (char_length(trigger_evidence) <= 3000),
  pause_condition text NOT NULL DEFAULT '' CHECK (char_length(pause_condition) <= 1000),
  budget_note text NOT NULL DEFAULT '' CHECK (char_length(budget_note) <= 1000),
  target_start_date date,
  -- [{ approver_id, approver_email, role: 'md' | 'medical_director', approved_at }]
  approvals jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(approvals) = 'array'),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'on_hold', 'filled', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One live requisition per published opening.
CREATE UNIQUE INDEX IF NOT EXISTS hr_requisitions_opening_idx ON public.hr_requisitions(career_opening_id)
  WHERE career_opening_id IS NOT NULL AND status IN ('draft', 'pending_approval', 'approved', 'on_hold');

ALTER TABLE public.hr_applications ADD COLUMN IF NOT EXISTS requisition_id uuid REFERENCES public.hr_requisitions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS hr_applications_requisition_idx ON public.hr_applications(requisition_id);

-- Interviewers declare conflicts (relative, close personal relationship)
-- before scoring; conflict_declared alone cannot tell "no conflict" from
-- "not yet answered".
ALTER TABLE public.hr_scorecards ADD COLUMN IF NOT EXISTS conflict_checked_at timestamptz;

ALTER TABLE public.hr_requisitions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_requisitions FROM anon, authenticated;
DROP TRIGGER IF EXISTS hr_requisitions_updated_at ON public.hr_requisitions;
CREATE TRIGGER hr_requisitions_updated_at BEFORE UPDATE ON public.hr_requisitions
  FOR EACH ROW EXECUTE FUNCTION public.set_hr_updated_at();
