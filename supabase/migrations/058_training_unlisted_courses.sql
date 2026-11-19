-- A public course can be unlisted: reachable by its link, but left out of
-- the /courses catalogue, the sitemap and search results.
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT true;
