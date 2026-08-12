-- Area of expertise is optional on the ambassador application form.

ALTER TABLE public.ambassador_applications
  ALTER COLUMN field_of_expertise DROP NOT NULL;
