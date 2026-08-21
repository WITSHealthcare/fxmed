-- One bill can be settled through any number of payment installments. Existing
-- aggregate payments are preserved as the first installment during migration.

CREATE TABLE IF NOT EXISTS public.emr_financial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_record_id uuid NOT NULL REFERENCES public.emr_financial_records(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  payment_method text CHECK (payment_method IN ('cash','card','bank_transfer','paystack','insurance','other')),
  payment_reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emr_financial_payments_bill_idx
  ON public.emr_financial_payments(financial_record_id, payment_date, created_at);
CREATE INDEX IF NOT EXISTS emr_financial_payments_patient_idx
  ON public.emr_financial_payments(patient_id, payment_date DESC);

ALTER TABLE public.emr_financial_payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reconcile_emr_financial_record(record_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  paid_total numeric(14, 2);
  latest_payment date;
  billed_total numeric(14, 2);
BEGIN
  SELECT coalesce(sum(amount), 0), max(payment_date)
    INTO paid_total, latest_payment
    FROM public.emr_financial_payments
   WHERE financial_record_id = record_id;

  SELECT amount_due INTO billed_total
    FROM public.emr_financial_records
   WHERE id = record_id;

  UPDATE public.emr_financial_records
     SET amount_paid = paid_total,
         paid_at = latest_payment,
         status = CASE
           WHEN paid_total = 0 THEN 'pending'
           WHEN paid_total >= billed_total THEN 'paid'
           ELSE 'partial'
         END,
         updated_at = now()
   WHERE id = record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_emr_financial_payment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.reconcile_emr_financial_record(OLD.financial_record_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.reconcile_emr_financial_record(NEW.financial_record_id);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reconcile_emr_financial_payment_trigger ON public.emr_financial_payments;
CREATE TRIGGER reconcile_emr_financial_payment_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.emr_financial_payments
FOR EACH ROW EXECUTE FUNCTION public.reconcile_emr_financial_payment_change();

REVOKE EXECUTE ON FUNCTION public.reconcile_emr_financial_record(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_emr_financial_payment_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_emr_financial_record(uuid) TO service_role;

INSERT INTO public.emr_financial_payments (
  financial_record_id, patient_id, amount, payment_date, payment_method,
  payment_reference, notes, created_by, created_at, updated_at
)
SELECT
  id, patient_id, amount_paid, coalesce(paid_at::date, service_date),
  payment_method, payment_reference, 'Opening payment migrated from the bill record.',
  created_by, created_at, updated_at
FROM public.emr_financial_records
WHERE amount_paid > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.emr_financial_payments payment
    WHERE payment.financial_record_id = emr_financial_records.id
  );
