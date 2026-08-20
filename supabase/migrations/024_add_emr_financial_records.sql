-- Patient-level billing and payment ledger for the clinical workspace.
-- This is separate from the organization-wide financial CRM so every amount
-- is explicitly attached to one canonical EMR patient.

CREATE TABLE IF NOT EXISTS public.emr_financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount_due numeric(14, 2) NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
  amount_paid numeric(14, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0 AND amount_paid <= amount_due),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN','USD')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue','waived','refunded')),
  payment_method text CHECK (payment_method IN ('cash','card','bank_transfer','paystack','insurance','other')),
  payment_reference text,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emr_financial_records_patient_idx
  ON public.emr_financial_records(patient_id, service_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS emr_financial_records_status_idx
  ON public.emr_financial_records(status, due_date);

-- Access is only through authenticated server routes using the service role.
ALTER TABLE public.emr_financial_records ENABLE ROW LEVEL SECURITY;
