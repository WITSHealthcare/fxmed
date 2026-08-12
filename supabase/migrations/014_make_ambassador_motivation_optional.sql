-- Motivation is optional on the ambassador application form.

ALTER TABLE public.ambassador_applications
  ALTER COLUMN motivation DROP NOT NULL;
