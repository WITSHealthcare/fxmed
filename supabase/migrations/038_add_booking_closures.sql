-- Days and times the team has closed to new bookings, set from the admin
-- Requests calendar. A row with no closed_time closes the whole day; a row
-- with a time (Lagos time, as "09:00") closes the hour that starts then.
-- Closing a day or time does not cancel bookings already made.
BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closed_date date NOT NULL,
  closed_time text CHECK (closed_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row for a whole day, and one for each time on a day.
CREATE UNIQUE INDEX IF NOT EXISTS booking_closures_day_idx
  ON public.booking_closures (closed_date) WHERE closed_time IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS booking_closures_time_idx
  ON public.booking_closures (closed_date, closed_time) WHERE closed_time IS NOT NULL;

-- Read and written only through the server routes with the service role.
ALTER TABLE public.booking_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_closures FROM anon, authenticated;

COMMIT;
