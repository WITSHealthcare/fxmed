-- Survey and quiz forms attached to training lessons. The form definition lives
-- on the lesson inside training_programs.modules; each learner keeps one
-- response per lesson, overwritten when they edit it or retake a quiz.
CREATE TABLE IF NOT EXISTS public.training_form_responses (
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  lesson_id text NOT NULL CHECK (char_length(lesson_id) BETWEEN 1 AND 80),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  score integer CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  passed boolean,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS training_form_responses_user_idx ON public.training_form_responses(user_id, submitted_at DESC);

ALTER TABLE public.training_form_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_form_responses FROM anon, authenticated;
