-- The invoices a clinician builds for a lab order from the price list: one for
-- lab collection and one for home collection. Each keeps its lines (the test,
-- the price list line it was priced from, and the amount), so the invoice can
-- be downloaded again and added to the patient's bills once approved. Safe to
-- run more than once.
BEGIN;

CREATE TABLE IF NOT EXISTS public.investigation_order_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_form_id uuid NOT NULL REFERENCES public.investigation_forms(id) ON DELETE CASCADE,
  emr_patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  collection_type text NOT NULL CHECK (collection_type IN ('lab','home')),
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  saved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  saved_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_form_id, collection_type)
);

-- Access is only through authenticated server routes using the service role.
ALTER TABLE public.investigation_order_invoices ENABLE ROW LEVEL SECURITY;

COMMIT;
