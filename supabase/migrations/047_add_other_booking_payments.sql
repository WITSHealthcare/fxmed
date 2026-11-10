-- "Other" bookings and payments, added by staff from the Add booking form
-- (the financial CRM, the Requests calendar and the EMR): anything that is not
-- a telemedicine call or a home visit, such as a lab test or supplements, with
-- its own name and amount. Telemedicine and home visits keep their standard
-- prices; their amount stays empty.
BEGIN;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS amount numeric(14, 2);

-- Replace any earlier rule on consultation_type (the table predates these
-- migrations, so its name is not known) with one that also allows "other".
DO $$
DECLARE
  rule record;
BEGIN
  FOR rule IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%consultation_type%' OR pg_get_constraintdef(oid) ILIKE '%amount%')
  LOOP
    EXECUTE format('ALTER TABLE public.appointments DROP CONSTRAINT %I', rule.conname);
  END LOOP;
END $$;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_consultation_type_check
  CHECK (consultation_type IN ('telemedicine', 'home-visit', 'other'));
ALTER TABLE public.appointments ADD CONSTRAINT appointments_amount_check
  CHECK (amount IS NULL OR amount >= 0);
-- An "other" booking always says what it is for and how much it costs.
ALTER TABLE public.appointments ADD CONSTRAINT appointments_other_details_check
  CHECK (consultation_type <> 'other' OR (service_name IS NOT NULL AND amount IS NOT NULL));

COMMIT;
