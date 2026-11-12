-- A lab order's tests can be added to the patient's bills once the patient has
-- approved lab or home collection. The bill remembers which order it is for
-- and how the sample is collected, and an order can only be billed once, so
-- lab and home collection are never both charged. Safe to run more than once.
BEGIN;

ALTER TABLE public.emr_financial_records
  ADD COLUMN IF NOT EXISTS investigation_form_id uuid REFERENCES public.investigation_forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collection_type text CHECK (collection_type IN ('lab','home'));

CREATE UNIQUE INDEX IF NOT EXISTS emr_financial_records_order_idx
  ON public.emr_financial_records(investigation_form_id)
  WHERE investigation_form_id IS NOT NULL;

COMMIT;
