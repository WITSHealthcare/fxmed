-- Follow-ups: anything the team has to chase a patient about, such as an
-- investigation form sent but not yet done. They are clinical tasks with a due
-- date, optionally raised from the note that documents them, and every attempt
-- to reach the patient is logged against them so the team can see what has
-- already been tried.
BEGIN;

ALTER TABLE public.emr_clinical_tasks
  ADD COLUMN IF NOT EXISTS note_id uuid
    REFERENCES public.emr_clinical_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  -- What happened, written when the follow-up is closed or cancelled.
  ADD COLUMN IF NOT EXISTS outcome text;

CREATE INDEX IF NOT EXISTS emr_clinical_tasks_open_due_idx
  ON public.emr_clinical_tasks(due_at)
  WHERE status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS emr_clinical_tasks_patient_idx
  ON public.emr_clinical_tasks(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS emr_clinical_tasks_note_idx
  ON public.emr_clinical_tasks(note_id);

CREATE TABLE IF NOT EXISTS public.emr_task_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.emr_clinical_tasks(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('call','whatsapp','sms','email','in_person','other')),
  outcome text NOT NULL CHECK (outcome IN ('reached','no_answer','left_message','wrong_number','other')),
  notes text,
  -- Set when the contact moved the follow-up to a new date.
  rescheduled_to timestamptz,
  contacted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emr_task_contacts_task_idx
  ON public.emr_task_contacts(task_id, contacted_at DESC);

-- Read and written only through the server routes, as in 018.
ALTER TABLE public.emr_task_contacts ENABLE ROW LEVEL SECURITY;

COMMIT;
