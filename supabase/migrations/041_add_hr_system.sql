-- HR system: recruiting, employee records and onboarding, performance, leave,
-- pay and offboarding. Staff files hold personal and sensitive personal data
-- (NDPA 2023), so every table is server-managed: RLS on, no browser policies,
-- REVOKE ALL from anon/authenticated. All access goes through the authorized
-- /api/admin/hr/* and /api/careers/apply routes using the service role, which
-- apply the rules in lib/hr.ts (canHr). Dates are Lagos dates.
--
-- Areas own their tables (see lib/hr.ts hrTableOwners). Recruiting gaps are
-- in 042_hr_recruiting.sql. 043 is taken by 043_add_forms.sql, so later HR
-- migrations take the next free number.

CREATE OR REPLACE FUNCTION public.set_hr_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------------------------------------------------------------------------
-- People: employee file, payroll identifiers, documents, credentials,
-- onboarding checklists. Created first because the other areas reference it.
-- ---------------------------------------------------------------------------

-- One row per staff member, locum, contractor, intern or NYSC corps member.
-- auth_user_id links a portal account where they have one (locums often do not).
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_number text UNIQUE CHECK (staff_number IS NULL OR char_length(staff_number) BETWEEN 1 AND 40),
  legal_name text NOT NULL CHECK (char_length(legal_name) BETWEEN 1 AND 160),
  preferred_name text CHECK (preferred_name IS NULL OR char_length(preferred_name) <= 160),
  work_email text CHECK (work_email IS NULL OR char_length(work_email) <= 254),
  personal_email text CHECK (personal_email IS NULL OR char_length(personal_email) <= 254),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  -- Sensitive personal details: admin and the employee only (see canHr 'employee_private').
  date_of_birth date,
  gender text CHECK (gender IS NULL OR char_length(gender) <= 40),
  nin text CHECK (nin IS NULL OR char_length(nin) <= 20),
  address text CHECK (address IS NULL OR char_length(address) <= 500),
  emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(emergency_contacts) = 'array'),
  photo_path text,
  -- Job
  job_title text NOT NULL CHECK (char_length(job_title) BETWEEN 1 AND 160),
  department text NOT NULL DEFAULT 'Clinical'
    CHECK (department IN ('Clinical', 'Operations', 'Marketing', 'Technology', 'Finance')),
  employment_type text NOT NULL DEFAULT 'Full-time'
    CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship', 'Locum')),
  level text CHECK (level IS NULL OR level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
  portal_role text NOT NULL DEFAULT 'none' CHECK (portal_role IN ('admin', 'clinical', 'sales', 'none')),
  work_pattern text CHECK (work_pattern IS NULL OR work_pattern IN ('office', 'field', 'virtual', 'mixed')),
  location text CHECK (location IS NULL OR char_length(location) <= 160),
  line_manager_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  buddy_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  clinical_supervisor_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  career_opening_id uuid REFERENCES public.career_openings(id) ON DELETE SET NULL,
  start_date date,
  probation_end_date date,
  confirmed_at timestamptz,
  end_date date,
  leaving_reason text,
  status text NOT NULL DEFAULT 'pre_start'
    CHECK (status IN ('offer_accepted', 'pre_start', 'probation', 'probation_extended', 'active', 'on_leave', 'suspended', 'notice', 'exited')),
  legal_hold boolean NOT NULL DEFAULT false,
  retention_until date,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (line_manager_id IS NULL OR line_manager_id <> id),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Pay and statutory identifiers, kept apart from the employee row so a
-- manager's view of their report can never select them by accident.
CREATE TABLE IF NOT EXISTS public.hr_payroll_profiles (
  employee_id uuid PRIMARY KEY REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  bank_name text,
  account_number text CHECK (account_number IS NULL OR account_number ~ '^[0-9]{10}$'),
  account_name text,
  bvn text CHECK (bvn IS NULL OR bvn ~ '^[0-9]{11}$'),
  tin text,
  paye_state text DEFAULT 'Lagos',
  pfa_name text,
  rsa_pin text,
  nhf_number text,
  pension_employee_rate numeric(5,2) NOT NULL DEFAULT 8 CHECK (pension_employee_rate BETWEEN 0 AND 100),
  pension_employer_rate numeric(5,2) NOT NULL DEFAULT 10 CHECK (pension_employer_rate BETWEEN 0 AND 100),
  group_life_enrolled_at date,
  hmo_enrolled_at date,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Recruiting: candidates, applications against career_openings, stage history,
-- interviews, scorecards, references and offers.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 160),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  location text CHECK (location IS NULL OR char_length(location) <= 160),
  source text NOT NULL DEFAULT 'careers_page'
    CHECK (source IN ('careers_page', 'referral', 'linkedin', 'job_board', 'agency', 'locum_pool', 'other')),
  referrer_employee_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  privacy_notice_version text NOT NULL CHECK (char_length(privacy_notice_version) BETWEEN 1 AND 40),
  privacy_acknowledged_at timestamptz NOT NULL DEFAULT now(),
  talent_pool_consent boolean NOT NULL DEFAULT false,
  talent_pool_consent_at timestamptz,
  talent_pool_expires_at date,
  retention_delete_after date,
  anonymised_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT talent_pool_consent OR talent_pool_consent_at IS NOT NULL)
);
-- One live candidate per email so repeat applications share consent state.
CREATE UNIQUE INDEX IF NOT EXISTS hr_candidates_email_idx ON public.hr_candidates(lower(email)) WHERE anonymised_at IS NULL;

CREATE TABLE IF NOT EXISTS public.hr_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  career_opening_id uuid REFERENCES public.career_openings(id) ON DELETE SET NULL,
  -- Snapshot so the record still reads correctly if the opening is deleted.
  opening_title text NOT NULL CHECK (char_length(opening_title) BETWEEN 1 AND 160),
  department text CHECK (department IS NULL OR department IN ('Clinical', 'Operations', 'Marketing', 'Technology', 'Finance')),
  role_family text CHECK (role_family IS NULL OR role_family IN ('A', 'B', 'C', 'D', 'E', 'F')),
  hiring_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cv_path text,
  cover_note text NOT NULL DEFAULT '' CHECK (char_length(cover_note) <= 5000),
  salary_expectation_ngn numeric(14,2) CHECK (salary_expectation_ngn IS NULL OR salary_expectation_ngn >= 0),
  notice_period text CHECK (notice_period IS NULL OR char_length(notice_period) <= 120),
  right_to_work_status text CHECK (right_to_work_status IS NULL OR char_length(right_to_work_status) <= 120),
  stage text NOT NULL DEFAULT 'applied'
    CHECK (stage IN ('applied', 'screened', 'phone_screen', 'assessment', 'interview_loop', 'debrief', 'references_credentials', 'offer_approval', 'offer_extended', 'accepted', 'pre_boarding', 'hired', 'rejected', 'withdrawn')),
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  stage_due_at timestamptz,
  rejection_reason text,
  withdrawal_reason text,
  decision text CHECK (decision IS NULL OR decision IN ('hire', 'no_hire')),
  decision_reason text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  last_candidate_contact_at timestamptz,
  -- Set at the 'hired' stage when the candidate becomes an employee.
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hr_applications_candidate_opening_idx ON public.hr_applications(candidate_id, career_opening_id) WHERE career_opening_id IS NOT NULL;

-- Append-only audit of stage changes and candidate communication (SLA and fairness review).
CREATE TABLE IF NOT EXISTS public.hr_application_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text,
  note text NOT NULL DEFAULT '',
  communication_sent boolean NOT NULL DEFAULT false,
  communication_channel text CHECK (communication_channel IS NULL OR communication_channel IN ('email', 'phone', 'whatsapp', 'in_person', 'other')),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Competencies with 1-4 anchors per role family; decision rules from recruiting-process.md.
CREATE TABLE IF NOT EXISTS public.hr_scorecard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_family text NOT NULL CHECK (role_family IN ('A', 'B', 'C', 'D', 'E', 'F')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  -- [{ code, name, is_core, is_knockout, anchors: [a1,a2,a3,a4], loop_step_codes: [] }]
  competencies jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(competencies) = 'array'),
  min_average numeric(3,2) NOT NULL DEFAULT 3.0 CHECK (min_average BETWEEN 1 AND 4),
  max_twos integer NOT NULL DEFAULT 1 CHECK (max_twos >= 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_family, version)
);

CREATE TABLE IF NOT EXISTS public.hr_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  loop_step_code text NOT NULL DEFAULT '' CHECK (char_length(loop_step_code) <= 10),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  format text NOT NULL DEFAULT 'in_person' CHECK (format IN ('in_person', 'video', 'phone', 'take_home')),
  scheduled_at timestamptz,
  duration_min integer CHECK (duration_min IS NULL OR duration_min BETWEEN 5 AND 600),
  location_or_link text CHECK (location_or_link IS NULL OR char_length(location_or_link) <= 1000),
  adjustments_requested text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per (interview, interviewer). The row is the assignment: a
-- scorecard is visible only to admin and to interviewer_id (canHr 'scorecard').
CREATE TABLE IF NOT EXISTS public.hr_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.hr_interviews(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  interviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.hr_scorecard_templates(id) ON DELETE SET NULL,
  conflict_declared boolean NOT NULL DEFAULT false,
  conflict_note text,
  -- [{ competency_code, rating 1-4, evidence }]
  ratings jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(ratings) = 'array'),
  overall_recommendation text CHECK (overall_recommendation IS NULL OR overall_recommendation IN ('strong_no', 'no', 'yes', 'strong_yes')),
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (interview_id, interviewer_id),
  CHECK (status <> 'submitted' OR (submitted_at IS NOT NULL AND overall_recommendation IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.hr_reference_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  referee_name text NOT NULL CHECK (char_length(referee_name) BETWEEN 1 AND 160),
  referee_relationship text,
  referee_organisation text,
  referee_contact text,
  is_current_employer boolean NOT NULL DEFAULT false,
  candidate_consent_at timestamptz,
  dates_confirmed boolean,
  -- { reliability, quality, conduct, complaints, re_employ }
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  outcome text CHECK (outcome IS NULL OR outcome IN ('clear', 'concern', 'unable_to_contact')),
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Offer approval form and the offer extended. Pay fields: admin only.
CREATE TABLE IF NOT EXISTS public.hr_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  job_title text NOT NULL CHECK (char_length(job_title) BETWEEN 1 AND 160),
  employment_type text NOT NULL DEFAULT 'Full-time'
    CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship', 'Locum')),
  band_code text,
  basic_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (basic_ngn >= 0),
  housing_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (housing_ngn >= 0),
  transport_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (transport_ngn >= 0),
  other_allowances_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (other_allowances_ngn >= 0),
  gross_monthly_ngn numeric(14,2) GENERATED ALWAYS AS (basic_ngn + housing_ngn + transport_ngn + other_allowances_ngn) STORED,
  locum_session_rate_ngn numeric(14,2) CHECK (locum_session_rate_ngn IS NULL OR locum_session_rate_ngn >= 0),
  commission_terms text,
  sign_on_bonus_ngn numeric(14,2) CHECK (sign_on_bonus_ngn IS NULL OR sign_on_bonus_ngn >= 0),
  above_midpoint_reason text,
  start_date date,
  probation_months integer NOT NULL DEFAULT 3 CHECK (probation_months BETWEEN 0 AND 12),
  notice_terms text,
  contract_type text NOT NULL DEFAULT 'employment' CHECK (contract_type IN ('employment', 'services_agreement')),
  conditions text,
  references_clear boolean NOT NULL DEFAULT false,
  credentials_clear boolean NOT NULL DEFAULT false,
  -- [{ approver_id, role: 'md' | 'medical_director', approved_at }]
  approvals jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(approvals) = 'array'),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'accepted', 'declined', 'withdrawn', 'expired')),
  sent_at timestamptz,
  response_due_at timestamptz,
  responded_at timestamptz,
  decline_reason text,
  offer_letter_path text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- People (continued): documents metadata, credentials, onboarding.
-- ---------------------------------------------------------------------------

-- Metadata only; files live in the private hr-documents bucket under
-- candidates/<application_id>/... or employees/<employee_id>/...
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('cv', 'id', 'certificate', 'licence', 'indemnity', 'nysc', 'proof_of_address', 'reference', 'guarantor', 'contract', 'offer_letter', 'confidentiality', 'medical', 'immunisation', 'sick_note', 'payslip', 'letter', 'other')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  storage_path text NOT NULL,
  mime_type text,
  size_bytes integer CHECK (size_bytes IS NULL OR size_bytes BETWEEN 0 AND 15728640),
  -- Restricted documents (health, checks, conduct): admin, plus the employee for their own
  -- except reference responses and guarantor forms (people/shared.ts canOpenDocument).
  is_restricted boolean NOT NULL DEFAULT false,
  original_seen_at timestamptz,
  original_seen_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_method text,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('requested', 'uploaded', 'verified', 'rejected', 'expired', 'deleted')),
  retention_until date,
  deleted_at timestamptz,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (employee_id IS NOT NULL OR application_id IS NOT NULL)
);

-- Identity, qualifications, professional licences and indemnity. Checked
-- against an application before offer; employee_id is set at hire so expiry
-- tracking (90/60/30/7-day reminders) continues on the employee file.
CREATE TABLE IF NOT EXISTS public.hr_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.hr_applications(id) ON DELETE SET NULL,
  credential_type text NOT NULL CHECK (credential_type IN ('NIN', 'right_to_work', 'degree', 'MDCN', 'NMCN_RN', 'NMCN_RM', 'MLSCN', 'PCN', 'dietitians_council', 'SLT_board', 'BLS', 'NRP', 'indemnity', 'CIPM', 'ICAN', 'ANAN', 'drivers_licence', 'police_certificate', 'other')),
  issuing_body text,
  registration_number text,
  licence_number text,
  issued_on date,
  expires_on date,
  cpd_points_required integer CHECK (cpd_points_required IS NULL OR cpd_points_required >= 0),
  verification_method text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  document_id uuid REFERENCES public.hr_documents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification', 'current', 'expiring_soon', 'expired', 'suspended', 'failed', 'superseded')),
  supersedes_id uuid REFERENCES public.hr_credentials(id) ON DELETE SET NULL,
  reminder_90_sent_at timestamptz,
  reminder_60_sent_at timestamptz,
  reminder_30_sent_at timestamptz,
  reminder_7_sent_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (employee_id IS NOT NULL OR application_id IS NOT NULL),
  CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on)
);

-- Reusable checklists. kind 'onboarding' is owned by People, 'offboarding' by Performance.
CREATE TABLE IF NOT EXISTS public.hr_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('onboarding', 'offboarding')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  departments text[] NOT NULL DEFAULT '{}',
  employment_types text[] NOT NULL DEFAULT '{}',
  -- [{ stage|category, item, owner: 'hr'|'employee'|'manager'|'it', due_offset_days }]
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'pre_start' CHECK (stage IN ('pre_start', 'day_one', 'week_one', 'probation')),
  category text NOT NULL DEFAULT 'documents'
    CHECK (category IN ('contract', 'documents', 'licence', 'checks', 'statutory', 'it_accounts', 'training', 'equipment', 'other')),
  item text NOT NULL CHECK (char_length(item) BETWEEN 1 AND 300),
  -- Who acts: the employee may tick only items owned by 'employee'.
  owner text NOT NULL DEFAULT 'hr' CHECK (owner IN ('hr', 'employee', 'manager', 'it')),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'exception_approved', 'not_applicable')),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_document_id uuid REFERENCES public.hr_documents(id) ON DELETE SET NULL,
  exception_reason text,
  exception_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exception_approved_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'exception_approved' OR (exception_reason IS NOT NULL AND exception_approved_by IS NOT NULL))
);

-- ---------------------------------------------------------------------------
-- Performance: probation reviews and appraisals, goals, improvement plans.
-- ---------------------------------------------------------------------------

-- Week-one, 30/60/90-day probation check-ins, the probation decision, and
-- mid-year/annual appraisals share one table, distinguished by review_type.
CREATE TABLE IF NOT EXISTS public.hr_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  review_type text NOT NULL CHECK (review_type IN ('week_1', 'day_30', 'day_60', 'day_90', 'probation_decision', 'mid_year', 'annual')),
  review_year integer CHECK (review_year IS NULL OR review_year BETWEEN 2020 AND 2100),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_date date,
  held_at timestamptz,
  self_review text NOT NULL DEFAULT '',
  -- { training, attendance, conduct, team_fit } for check-ins; KPI and behaviour scores for appraisals.
  scores jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scores) = 'object'),
  manager_summary text NOT NULL DEFAULT '',
  improvement_actions text NOT NULL DEFAULT '',
  overall_rating integer CHECK (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5),
  ethics_override boolean NOT NULL DEFAULT false,
  ethics_override_reason text,
  calibrated_rating integer CHECK (calibrated_rating IS NULL OR calibrated_rating BETWEEN 1 AND 5),
  probation_outcome text CHECK (probation_outcome IS NULL OR probation_outcome IN ('confirmed', 'extended', 'not_confirmed')),
  probation_new_end_date date,
  clinical_signoff_ref text,
  employee_comment text NOT NULL DEFAULT '',
  employee_acknowledged_at timestamptz,
  manager_signed_at timestamptz,
  second_review_requested_at timestamptz,
  second_review_outcome text,
  letter_document_id uuid REFERENCES public.hr_documents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'self_review', 'manager_review', 'calibration', 'final', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT ethics_override OR (ethics_override_reason IS NOT NULL AND coalesce(calibrated_rating, overall_rating, 1) <= 2)),
  CHECK (probation_outcome IS NULL OR review_type = 'probation_decision'),
  CHECK (probation_outcome IS DISTINCT FROM 'extended' OR probation_new_end_date IS NOT NULL)
);

-- Goals and KPIs. Test, supplement, diagnosis and upgrade targets are never
-- allowed (performance-management.md); builders validate titles, not the DB.
CREATE TABLE IF NOT EXISTS public.hr_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  review_year integer NOT NULL CHECK (review_year BETWEEN 2020 AND 2100),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  measure text NOT NULL DEFAULT '',
  target text NOT NULL DEFAULT '',
  data_source text NOT NULL DEFAULT '',
  is_development_goal boolean NOT NULL DEFAULT false,
  due_date date,
  progress_notes text NOT NULL DEFAULT '',
  rating integer CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'agreed', 'on_track', 'at_risk', 'met', 'not_met', 'dropped')),
  agreed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Capability plans (60 days, weekly check-ins), kept separate from misconduct.
CREATE TABLE IF NOT EXISTS public.hr_improvement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  -- [{ area, standard, measure, support }]
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(gaps) = 'array'),
  -- [{ date, note, by }]
  check_ins jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(check_ins) = 'array'),
  training_program_ids uuid[] NOT NULL DEFAULT '{}',
  outcome_notes text NOT NULL DEFAULT '',
  extended_to date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('informal_support', 'active', 'extended', 'passed', 'not_passed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- Leave (owned by Performance). Taken and pending days are derived from
-- hr_leave_requests, not stored, so balances cannot drift.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_year integer NOT NULL CHECK (leave_year BETWEEN 2020 AND 2100),
  leave_type text NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'adoption', 'compassionate', 'study', 'unpaid', 'toil')),
  entitled_days numeric(5,1) NOT NULL DEFAULT 0 CHECK (entitled_days >= 0),
  pro_rata_factor numeric(4,3) NOT NULL DEFAULT 1 CHECK (pro_rata_factor BETWEEN 0 AND 1),
  carried_over_days numeric(5,1) NOT NULL DEFAULT 0 CHECK (carried_over_days >= 0),
  carry_over_expires_on date,
  adjustment_days numeric(5,1) NOT NULL DEFAULT 0,
  adjustment_reason text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_year, leave_type)
);

CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'adoption', 'compassionate', 'study', 'unpaid', 'toil', 'public_holiday_in_lieu')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  working_days numeric(5,1) NOT NULL CHECK (working_days > 0),
  -- Sick-leave reasons and medical evidence are admin only (canHr 'leave_private').
  reason text NOT NULL DEFAULT '',
  cover_employee_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  handover_notes text NOT NULL DEFAULT '',
  evidence_document_id uuid REFERENCES public.hr_documents(id) ON DELETE SET NULL,
  approval_level text NOT NULL DEFAULT 'manager' CHECK (approval_level IN ('manager', 'md')),
  pay_treatment text NOT NULL DEFAULT 'full' CHECK (pay_treatment IN ('full', 'half', 'unpaid')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'approved', 'approved_with_changes', 'declined', 'cancelled', 'cancelled_by_employer', 'taken')),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_reason text,
  returned_on date,
  return_meeting_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (status NOT IN ('declined', 'cancelled_by_employer') OR decision_reason IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.hr_public_holidays (
  holiday_date date PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  confirmed boolean NOT NULL DEFAULT false,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Pay (owned by Performance; admin only, the employee sees their own history).
-- ---------------------------------------------------------------------------

-- Placeholder bands until the MD and accountant confirm them.
CREATE TABLE IF NOT EXISTS public.hr_salary_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL CHECK (char_length(code) BETWEEN 1 AND 20),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 160),
  level text CHECK (level IS NULL OR level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
  department text CHECK (department IS NULL OR department IN ('Clinical', 'Operations', 'Marketing', 'Technology', 'Finance')),
  pay_basis text NOT NULL DEFAULT 'monthly' CHECK (pay_basis IN ('monthly', 'per_session', 'contract_monthly')),
  min_ngn numeric(14,2) NOT NULL CHECK (min_ngn >= 0),
  midpoint_ngn numeric(14,2) NOT NULL,
  max_ngn numeric(14,2) NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  effective_from date NOT NULL DEFAULT current_date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, effective_from),
  CHECK (min_ngn <= midpoint_ngn AND midpoint_ngn <= max_ngn),
  CHECK (NOT confirmed OR confirmed_at IS NOT NULL)
);

-- Effective-dated pay. The latest row on or before today is current pay.
CREATE TABLE IF NOT EXISTS public.hr_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  level text CHECK (level IS NULL OR level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
  band_code text,
  basic_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (basic_ngn >= 0),
  housing_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (housing_ngn >= 0),
  transport_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (transport_ngn >= 0),
  other_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (other_ngn >= 0),
  monthly_gross_ngn numeric(14,2) GENERATED ALWAYS AS (basic_ngn + housing_ngn + transport_ngn + other_ngn) STORED,
  locum_session_rate_ngn numeric(14,2) CHECK (locum_session_rate_ngn IS NULL OR locum_session_rate_ngn >= 0),
  reason text NOT NULL DEFAULT 'hire' CHECK (reason IN ('hire', 'annual_review', 'promotion', 'adjustment', 'correction')),
  offer_id uuid REFERENCES public.hr_offers(id) ON DELETE SET NULL,
  review_id uuid REFERENCES public.hr_reviews(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, effective_date)
);

-- ---------------------------------------------------------------------------
-- Offboarding (owned by Performance).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hr_offboarding_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  exit_type text NOT NULL CHECK (exit_type IN ('resignation', 'termination', 'end_of_contract', 'probation_not_confirmed', 'redundancy', 'retirement', 'death', 'other')),
  notice_received_at date,
  notice_period_text text,
  last_working_day date,
  garden_leave boolean NOT NULL DEFAULT false,
  pay_in_lieu boolean NOT NULL DEFAULT false,
  handover_plan text NOT NULL DEFAULT '',
  patients_reassigned_at timestamptz,
  leads_reassigned_at timestamptz,
  portal_access_removed_at timestamptz,
  equipment_returned_at timestamptz,
  final_pay_date date,
  -- [{ label, amount_ngn }] pro-rated salary, notice in lieu, leave payout, consented deductions
  final_pay_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(final_pay_items) = 'array'),
  -- Admin only; reported quarterly with names removed.
  exit_interview jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(exit_interview) = 'object'),
  pressure_flag boolean NOT NULL DEFAULT false,
  certificate_of_service_issued_at timestamptz,
  reference_consent boolean,
  re_employable text CHECK (re_employable IS NULL OR re_employable IN ('yes', 'no', 'with_conditions')),
  status text NOT NULL DEFAULT 'notice' CHECK (status IN ('notice', 'handover', 'access_removed', 'final_pay_pending', 'closed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hr_offboarding_cases_open_idx ON public.hr_offboarding_cases(employee_id) WHERE status NOT IN ('closed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.hr_offboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.hr_offboarding_cases(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'access' CHECK (category IN ('access', 'equipment', 'handover', 'records', 'pay', 'other')),
  item text NOT NULL CHECK (char_length(item) BETWEEN 1 AND 300),
  owner text NOT NULL DEFAULT 'hr' CHECK (owner IN ('hr', 'employee', 'manager', 'it')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'not_applicable', 'missing')),
  done_at timestamptz,
  done_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NDPA: subject requests and evidence of retention deletions (People owns the
-- UI; the Recruiting retention job also writes hr_retention_log rows).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hr_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.hr_candidates(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  subject_name text NOT NULL CHECK (char_length(subject_name) BETWEEN 1 AND 160),
  request_type text NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'withdraw_consent', 'objection', 'reference', 'breach')),
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_progress', 'completed', 'refused_with_reason')),
  outcome text,
  completed_at timestamptz,
  ndpc_notified_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_retention_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  entity_type text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('deleted', 'anonymised', 'moved_to_employee_file')),
  retention_rule text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS hr_employees_status_idx ON public.hr_employees(status, department);
CREATE INDEX IF NOT EXISTS hr_employees_manager_idx ON public.hr_employees(line_manager_id);
CREATE INDEX IF NOT EXISTS hr_applications_stage_idx ON public.hr_applications(stage, stage_due_at);
CREATE INDEX IF NOT EXISTS hr_applications_opening_idx ON public.hr_applications(career_opening_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hr_applications_candidate_idx ON public.hr_applications(candidate_id);
CREATE INDEX IF NOT EXISTS hr_application_events_app_idx ON public.hr_application_events(application_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS hr_interviews_app_idx ON public.hr_interviews(application_id, scheduled_at);
CREATE INDEX IF NOT EXISTS hr_scorecards_interviewer_idx ON public.hr_scorecards(interviewer_id, status);
CREATE INDEX IF NOT EXISTS hr_scorecards_app_idx ON public.hr_scorecards(application_id);
CREATE INDEX IF NOT EXISTS hr_reference_checks_app_idx ON public.hr_reference_checks(application_id);
CREATE INDEX IF NOT EXISTS hr_offers_app_idx ON public.hr_offers(application_id, status);
CREATE INDEX IF NOT EXISTS hr_documents_employee_idx ON public.hr_documents(employee_id, document_type);
CREATE INDEX IF NOT EXISTS hr_documents_application_idx ON public.hr_documents(application_id);
CREATE INDEX IF NOT EXISTS hr_credentials_employee_idx ON public.hr_credentials(employee_id, credential_type);
CREATE INDEX IF NOT EXISTS hr_credentials_expiry_idx ON public.hr_credentials(expires_on) WHERE status IN ('current', 'expiring_soon');
CREATE INDEX IF NOT EXISTS hr_onboarding_items_employee_idx ON public.hr_onboarding_items(employee_id, stage, sort_order);
CREATE INDEX IF NOT EXISTS hr_reviews_employee_idx ON public.hr_reviews(employee_id, review_type, scheduled_date);
CREATE INDEX IF NOT EXISTS hr_reviews_reviewer_idx ON public.hr_reviews(reviewer_id, status);
CREATE INDEX IF NOT EXISTS hr_goals_employee_idx ON public.hr_goals(employee_id, review_year);
CREATE INDEX IF NOT EXISTS hr_improvement_plans_employee_idx ON public.hr_improvement_plans(employee_id, status);
CREATE INDEX IF NOT EXISTS hr_leave_requests_employee_idx ON public.hr_leave_requests(employee_id, start_date DESC);
CREATE INDEX IF NOT EXISTS hr_leave_requests_status_idx ON public.hr_leave_requests(status, start_date);
CREATE INDEX IF NOT EXISTS hr_compensation_employee_idx ON public.hr_compensation(employee_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS hr_offboarding_items_case_idx ON public.hr_offboarding_items(case_id, sort_order);
CREATE INDEX IF NOT EXISTS hr_data_requests_status_idx ON public.hr_data_requests(status, due_at);

-- ---------------------------------------------------------------------------
-- Server-managed: RLS on, no policies, no browser grants. updated_at triggers.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr_employees', 'hr_payroll_profiles', 'hr_candidates', 'hr_applications', 'hr_application_events',
    'hr_scorecard_templates', 'hr_interviews', 'hr_scorecards', 'hr_reference_checks', 'hr_offers',
    'hr_documents', 'hr_credentials', 'hr_checklist_templates', 'hr_onboarding_items',
    'hr_reviews', 'hr_goals', 'hr_improvement_plans', 'hr_leave_balances', 'hr_leave_requests',
    'hr_public_holidays', 'hr_salary_bands', 'hr_compensation', 'hr_offboarding_cases',
    'hr_offboarding_items', 'hr_data_requests', 'hr_retention_log'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'hr_employees', 'hr_payroll_profiles', 'hr_candidates', 'hr_applications', 'hr_scorecard_templates',
    'hr_interviews', 'hr_scorecards', 'hr_reference_checks', 'hr_offers', 'hr_documents', 'hr_credentials',
    'hr_checklist_templates', 'hr_onboarding_items', 'hr_reviews', 'hr_goals', 'hr_improvement_plans',
    'hr_leave_balances', 'hr_leave_requests', 'hr_salary_bands', 'hr_offboarding_cases',
    'hr_offboarding_items', 'hr_data_requests'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_hr_updated_at()', t || '_updated_at', t);
  END LOOP;
END $$;

-- Private bucket for CVs, licences, contracts and letters. Direct browser
-- access is denied; HR APIs upload and sign URLs with the service role.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hr-documents', 'hr-documents', false, 15728640, ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
