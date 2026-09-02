-- Role-based staff training managed through authenticated server routes.
CREATE TABLE IF NOT EXISTS public.training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  audience_roles text[] NOT NULL DEFAULT '{}',
  assigned_emails text[] NOT NULL DEFAULT '{}',
  modules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(modules) = 'array'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_progress (
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_lesson_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, user_id)
);

CREATE INDEX IF NOT EXISTS training_programs_status_idx ON public.training_programs(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS training_progress_user_idx ON public.training_progress(user_id, updated_at DESC);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_programs FROM anon, authenticated;
REVOKE ALL ON public.training_progress FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_training_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS training_programs_updated_at ON public.training_programs;
CREATE TRIGGER training_programs_updated_at BEFORE UPDATE ON public.training_programs FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();
