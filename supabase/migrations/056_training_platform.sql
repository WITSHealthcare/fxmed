-- Training becomes a course platform: catalogue and preview details, public
-- (and paid) courses for external learners, enrolments with due dates, full
-- quiz attempt history, and certificates. All access stays server-side.

-- Course details on the existing programs.
ALTER TABLE public.training_programs
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS price_kobo integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS cover_image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS learning_outcomes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS self_enrol boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sequential boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_due_days integer;

DO $$ BEGIN
  ALTER TABLE public.training_programs ADD CONSTRAINT training_programs_visibility_check CHECK (visibility IN ('internal', 'public', 'both'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.training_programs ADD CONSTRAINT training_programs_price_check CHECK (price_kobo >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.training_programs ADD CONSTRAINT training_programs_due_days_check CHECK (default_due_days IS NULL OR default_due_days BETWEEN 1 AND 365);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.training_programs ADD CONSTRAINT training_programs_slug_check CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS training_programs_slug_idx ON public.training_programs(slug) WHERE slug IS NOT NULL;

-- One row per learner per course. The single source of truth for who is
-- enrolled, how they joined, when it is due and whether they finished.
CREATE TABLE IF NOT EXISTS public.training_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_type text NOT NULL DEFAULT 'staff' CHECK (learner_type IN ('staff', 'external')),
  source text NOT NULL DEFAULT 'assigned' CHECK (source IN ('assigned', 'self', 'purchase', 'free', 'manual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'revoked')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz,
  certificate_id text UNIQUE,
  UNIQUE (program_id, user_id)
);
CREATE INDEX IF NOT EXISTS training_enrolments_user_idx ON public.training_enrolments(user_id);
CREATE INDEX IF NOT EXISTS training_enrolments_program_idx ON public.training_enrolments(program_id, status);

-- Every quiz or survey submission. training_form_responses keeps the latest
-- one per lesson (the HR Day-90 review links to it).
CREATE TABLE IF NOT EXISTS public.training_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  lesson_id text NOT NULL CHECK (char_length(lesson_id) BETWEEN 1 AND 80),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  score integer CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  passed boolean,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS training_attempts_lookup_idx ON public.training_attempts(program_id, user_id, lesson_id, submitted_at DESC);

-- Profile for people outside FXMed who sign up to take public courses.
CREATE TABLE IF NOT EXISTS public.training_learner_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 160),
  organisation text NOT NULL DEFAULT '',
  profession text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

-- Paystack transactions for paid courses. Access is granted only after the
-- server verifies a transaction with Paystack (webhook or callback).
CREATE TABLE IF NOT EXISTS public.training_payments (
  reference text PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kobo integer NOT NULL CHECK (amount_kobo > 0),
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  paystack_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
CREATE INDEX IF NOT EXISTS training_payments_user_idx ON public.training_payments(user_id, created_at DESC);

-- Existing progress becomes enrolments, so tracking covers people who
-- started before this migration.
INSERT INTO public.training_enrolments (program_id, user_id, learner_type, source, status, enrolled_at, started_at, last_activity_at)
SELECT program_id, user_id, 'staff', 'assigned', 'active', updated_at, updated_at, updated_at
FROM public.training_progress
ON CONFLICT (program_id, user_id) DO NOTHING;

ALTER TABLE public.training_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_learner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_enrolments FROM anon, authenticated;
REVOKE ALL ON public.training_attempts FROM anon, authenticated;
REVOKE ALL ON public.training_learner_accounts FROM anon, authenticated;
REVOKE ALL ON public.training_payments FROM anon, authenticated;
