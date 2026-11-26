-- Online payments through Paystack for patient invoices and bookings.
--
-- One row per Paystack checkout. A row is created as 'pending' before the
-- patient is sent to Paystack, and becomes 'success' only after the server
-- has verified the transaction with Paystack itself (lib/online-payments.ts),
-- from the redirect back or the signed webhook, whichever arrives first.
--
-- An invoice payment is then recorded as Paystack payments on the invoice's
-- bills (emr_financial_payments), so the existing reconcile trigger marks each
-- bill part-paid or paid. `allocations` lists those payments; anything paid
-- beyond what was owed at that moment is kept in `unallocated_kobo` for staff
-- to refund or apply. A booking payment marks the appointment paid.

BEGIN;

CREATE TABLE IF NOT EXISTS public.online_payments (
  reference text PRIMARY KEY CHECK (reference ~ '^fx(inv|bk)_'),
  kind text NOT NULL CHECK (kind IN ('invoice', 'booking')),
  invoice_id uuid REFERENCES public.emr_invoices(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  email text NOT NULL,
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  allocations jsonb NOT NULL DEFAULT '[]'::jsonb,
  unallocated_kobo bigint NOT NULL DEFAULT 0 CHECK (unallocated_kobo >= 0),
  settle_error text,
  paystack_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE INDEX IF NOT EXISTS online_payments_invoice_idx ON public.online_payments(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS online_payments_appointment_idx ON public.online_payments(appointment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS online_payments_patient_idx ON public.online_payments(patient_id, created_at DESC);

-- No browser access: only server routes using the service role read or write.
ALTER TABLE public.online_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.online_payments FROM anon, authenticated;

-- The Paystack reference a booking was paid with, for staff to look it up.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_reference text;

COMMIT;
