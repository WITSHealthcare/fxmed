-- Invoices for a patient, made from one or more bills on the chart's Financial
-- tab. Each line keeps the bill's description and amount as they were when the
-- invoice was made; what has been paid is read from the bills, so the invoice
-- shows the current balance. Sent invoices show in the patient's portal, under
-- Billing, with a notification. Safe to run more than once.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.emr_invoice_number_seq;

CREATE TABLE IF NOT EXISTS public.emr_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL UNIQUE
    DEFAULT ('INV-' || to_char(now() AT TIME ZONE 'Africa/Lagos', 'YYYY') || '-' || lpad(nextval('public.emr_invoice_number_seq')::text, 4, '0')),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN','USD')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  -- draft: made but not sent. sent: in the patient's portal. void: cancelled.
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','void')),
  sent_at timestamptz,
  voided_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emr_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.emr_invoices(id) ON DELETE CASCADE,
  financial_record_id uuid REFERENCES public.emr_financial_records(id) ON DELETE SET NULL,
  description text NOT NULL,
  service_date date,
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  position integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS emr_invoices_patient_idx ON public.emr_invoices(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS emr_invoice_items_invoice_idx ON public.emr_invoice_items(invoice_id, position);
CREATE INDEX IF NOT EXISTS emr_invoice_items_bill_idx ON public.emr_invoice_items(financial_record_id);

-- Access is only through authenticated server routes using the service role.
ALTER TABLE public.emr_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_invoice_items ENABLE ROW LEVEL SECURITY;

-- Portal notifications for invoices, opening the portal's Billing section.
-- Includes the lab test values from migration 050, so either can run first.
ALTER TABLE public.patient_portal_notifications DROP CONSTRAINT IF EXISTS patient_portal_notifications_kind_check;
ALTER TABLE public.patient_portal_notifications ADD CONSTRAINT patient_portal_notifications_kind_check
  CHECK (kind IN ('message','document','care_plan','appointment','form','lab_order','invoice'));

ALTER TABLE public.patient_portal_notifications DROP CONSTRAINT IF EXISTS patient_portal_notifications_section_check;
ALTER TABLE public.patient_portal_notifications ADD CONSTRAINT patient_portal_notifications_section_check
  CHECK (section IN ('overview','care_plan','documents','messages','forms','lab_results','billing'));

COMMIT;
