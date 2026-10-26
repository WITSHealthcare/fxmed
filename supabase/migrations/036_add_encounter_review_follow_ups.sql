-- Automatic review follow-ups for patients who have not been seen for a while.
--
-- When an active patient's last encounter is approaching 11 months old, a
-- "review progress" follow-up is raised for the team, due on the 11-month
-- mark and listed two weeks before it. While the patient is still not seen,
-- another is raised each month after (12, 13, ... months), one open at a time.
-- A new encounter closes the open review, and the months count again from
-- that encounter. A patient who is made inactive, or marked deceased, gets no
-- more reviews, and any open one is cancelled.
--
-- The EMR calls sync_encounter_review_follow_ups() when follow-ups, the
-- dashboard, notifications or a patient record are loaded, so the reviews are
-- up to date whenever anyone looks. It is safe to run any number of times.
BEGIN;

ALTER TABLE public.emr_clinical_tasks
  -- Set on follow-ups the system raises itself, naming the rule that raised it.
  ADD COLUMN IF NOT EXISTS automatic text CHECK (automatic IN ('encounter_review')),
  -- The encounter the months are counted from, and how many months it was.
  ADD COLUMN IF NOT EXISTS basis_encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_month integer;

-- One review per encounter per month, however many times the sync runs.
CREATE UNIQUE INDEX IF NOT EXISTS emr_clinical_tasks_encounter_review_idx
  ON public.emr_clinical_tasks(basis_encounter_id, review_month)
  WHERE automatic = 'encounter_review';

CREATE OR REPLACE FUNCTION public.sync_encounter_review_follow_ups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Reviews are listed this far ahead of the day they fall due.
  horizon date := (now() AT TIME ZONE 'Africa/Lagos')::date + 14;
  raised integer;
BEGIN
  -- A review is no longer needed once the patient has been seen again.
  -- Planned and cancelled encounters did not take place, so they do not count.
  WITH latest AS (
    SELECT DISTINCT ON (patient_id) patient_id, id, coalesce(started_at, created_at) AS seen_at
      FROM emr_encounters
     WHERE status NOT IN ('planned', 'cancelled')
     ORDER BY patient_id, coalesce(started_at, created_at) DESC
  )
  UPDATE emr_clinical_tasks AS task
     SET status = 'completed', completed_at = now(), updated_at = now(),
         outcome = 'Closed automatically: the patient was seen on ' || to_char(latest.seen_at AT TIME ZONE 'Africa/Lagos', 'FMDD Mon YYYY') || '.'
    FROM latest
   WHERE task.automatic = 'encounter_review'
     AND task.status IN ('pending', 'in_progress')
     AND latest.patient_id = task.patient_id
     AND latest.id IS DISTINCT FROM task.basis_encounter_id;

  -- Patients who are no longer active are not followed up.
  UPDATE emr_clinical_tasks AS task
     SET status = 'cancelled', completed_at = now(), updated_at = now(),
         outcome = 'Closed automatically: the patient record was marked ' || patient.status || '.'
    FROM emr_patients AS patient
   WHERE task.automatic = 'encounter_review'
     AND task.status IN ('pending', 'in_progress')
     AND patient.id = task.patient_id
     AND patient.status <> 'active';

  -- Raise the review for the latest monthly mark, from 11 months on, that
  -- falls within the horizon, unless one is already open for the patient.
  -- If nobody looked for a while, only the current month's is raised.
  WITH latest AS (
    SELECT DISTINCT ON (encounter.patient_id) encounter.patient_id, encounter.id AS encounter_id,
           (coalesce(encounter.started_at, encounter.created_at) AT TIME ZONE 'Africa/Lagos')::date AS seen_on
      FROM emr_encounters AS encounter
      JOIN emr_patients AS patient ON patient.id = encounter.patient_id AND patient.status = 'active'
     WHERE encounter.status NOT IN ('planned', 'cancelled')
     ORDER BY encounter.patient_id, coalesce(encounter.started_at, encounter.created_at) DESC
  ), due AS (
    SELECT latest.patient_id, latest.encounter_id, latest.seen_on, span.months,
           (latest.seen_on + make_interval(months => span.months))::date AS due_on
      FROM latest
      CROSS JOIN LATERAL (
        SELECT (extract(year FROM age(horizon, latest.seen_on)) * 12 + extract(month FROM age(horizon, latest.seen_on)))::integer AS months
      ) AS span
     WHERE span.months >= 11
  )
  INSERT INTO emr_clinical_tasks (patient_id, encounter_id, title, task_type, priority, status, due_at, automatic, basis_encounter_id, review_month)
  SELECT due.patient_id, due.encounter_id,
         'Review progress: no encounter since ' || to_char(due.seen_on, 'FMDD Mon YYYY') || ' (' || due.months || ' months)',
         'review', 'routine', 'pending',
         (due.due_on + time '09:00') AT TIME ZONE 'Africa/Lagos',
         'encounter_review', due.encounter_id, due.months
    FROM due
   WHERE NOT EXISTS (
     SELECT 1 FROM emr_clinical_tasks AS pending_review
      WHERE pending_review.patient_id = due.patient_id
        AND pending_review.automatic = 'encounter_review'
        AND pending_review.status IN ('pending', 'in_progress'))
  ON CONFLICT (basis_encounter_id, review_month) WHERE automatic = 'encounter_review' DO NOTHING;

  GET DIAGNOSTICS raised = ROW_COUNT;
  RETURN raised;
END;
$$;

-- Only the server, with the service role, may run it.
REVOKE ALL ON FUNCTION public.sync_encounter_review_follow_ups() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.sync_encounter_review_follow_ups() FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.sync_encounter_review_follow_ups() TO service_role;
  END IF;
END
$$;

COMMIT;
