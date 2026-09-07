-- The messages table predates this migrations folder, so this only adds the
-- column and leaves the rest of the table alone.
--
-- `source` records which public form produced a message, so health assessment
-- leads can be told apart from ordinary contact enquiries in the admin inbox.
-- Existing rows are all contact form submissions, which the default covers.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'contact_form';

-- Keep the values closed so a public endpoint cannot write arbitrary labels.
-- Dropped first so re-running the migration does not fail on an existing one.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_source_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_source_check
  CHECK (source IN ('contact_form', 'health_assessment'));

-- The admin inbox filters by source, and the notification bell counts unread
-- rows per source.
CREATE INDEX IF NOT EXISTS messages_source_created_at_idx
  ON public.messages (source, created_at DESC);
