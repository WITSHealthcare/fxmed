-- FXMed Healthcare / EMR core schema.
-- Keeps CRM leads separate from canonical clinical patients while allowing
-- explicit links to existing CRM, contacts, appointments and investigation data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS public.emr_mrn_seq START 1;

CREATE OR REPLACE FUNCTION public.next_emr_mrn()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'FXP-' || lpad(nextval('public.emr_mrn_seq')::text, 6, '0');
$$;

CREATE TABLE IF NOT EXISTS public.emr_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text NOT NULL UNIQUE DEFAULT public.next_emr_mrn(),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  sex text NOT NULL CHECK (sex IN ('female','male','intersex','unknown')),
  gender_identity text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'Nigeria',
  marital_status text,
  blood_group text,
  genotype text,
  occupation text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deceased')),
  crm_patient_id text,
  contact_id uuid,
  CONSTRAINT emr_patients_contact_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS emr_patients_crm_link_idx ON public.emr_patients(crm_patient_id) WHERE crm_patient_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS emr_patients_contact_link_idx ON public.emr_patients(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS emr_patients_name_idx ON public.emr_patients(lower(last_name), lower(first_name));
CREATE INDEX IF NOT EXISTS emr_patients_email_idx ON public.emr_patients(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS emr_patients_phone_idx ON public.emr_patients(phone) WHERE phone IS NOT NULL;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS appointments_patient_idx ON public.appointments(patient_id, preferred_date DESC);

CREATE TABLE IF NOT EXISTS public.emr_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_number text NOT NULL UNIQUE DEFAULT ('ENC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  encounter_type text NOT NULL DEFAULT 'consultation',
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('planned','waiting','in_progress','completed','cancelled')),
  chief_complaint text,
  history_presenting_illness text,
  past_medical_history text,
  surgical_history text,
  family_history text,
  social_history text,
  review_of_systems text,
  examination text,
  clinical_assessment text,
  treatment_plan text,
  follow_up_plan text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_encounters_patient_idx ON public.emr_encounters(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS emr_encounters_status_idx ON public.emr_encounters(status, created_at DESC);

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.emr_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  systolic_bp numeric(5,1),
  diastolic_bp numeric(5,1),
  heart_rate numeric(5,1),
  respiratory_rate numeric(5,1),
  temperature_c numeric(4,1),
  spo2 numeric(5,2),
  weight_kg numeric(7,2),
  height_cm numeric(7,2),
  bmi numeric(6,2),
  blood_glucose numeric(8,2),
  pain_score integer CHECK (pain_score BETWEEN 0 AND 10),
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_vitals_patient_idx ON public.emr_vitals(patient_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.emr_clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note_type text NOT NULL CHECK (note_type IN ('consultation','progress','nursing','procedure','discharge','follow_up')),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','amended')),
  parent_note_id uuid REFERENCES public.emr_clinical_notes(id) ON DELETE RESTRICT,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_notes_patient_idx ON public.emr_clinical_notes(patient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.protect_final_clinical_note()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('final','amended') AND (
    NEW.content IS DISTINCT FROM OLD.content OR
    NEW.note_type IS DISTINCT FROM OLD.note_type OR
    NEW.patient_id IS DISTINCT FROM OLD.patient_id OR
    NEW.encounter_id IS DISTINCT FROM OLD.encounter_id
  ) THEN
    RAISE EXCEPTION 'Finalized clinical notes cannot be overwritten; create an amendment instead.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_final_clinical_note_trigger ON public.emr_clinical_notes;
CREATE TRIGGER protect_final_clinical_note_trigger BEFORE UPDATE ON public.emr_clinical_notes FOR EACH ROW EXECUTE FUNCTION public.protect_final_clinical_note();

CREATE TABLE IF NOT EXISTS public.emr_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  diagnosis_name text NOT NULL,
  icd10_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','historical')),
  notes text,
  diagnosed_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_diagnoses_patient_idx ON public.emr_diagnoses(patient_id, status, diagnosed_at DESC);

CREATE TABLE IF NOT EXISTS public.emr_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  allergen text NOT NULL,
  reaction text,
  severity text NOT NULL DEFAULT 'unknown' CHECK (severity IN ('mild','moderate','severe','unknown')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','entered_in_error')),
  identified_at date,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_allergies_patient_idx ON public.emr_allergies(patient_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.emr_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  prescriber_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  generic_name text,
  strength text,
  dose text,
  route text,
  frequency text,
  duration text,
  quantity text,
  instructions text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','discontinued')),
  discontinued_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_medications_patient_idx ON public.emr_medications(patient_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.emr_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number text NOT NULL UNIQUE DEFAULT ('RX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  medication_id uuid NOT NULL REFERENCES public.emr_medications(id) ON DELETE RESTRICT,
  prescriber_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'signed' CHECK (status IN ('draft','signed','cancelled')),
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emr_investigation_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  ordering_provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  test_name text NOT NULL,
  category text,
  clinical_indication text,
  priority text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','collected','in_progress','completed','cancelled')),
  ordered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_investigation_orders_patient_idx ON public.emr_investigation_orders(patient_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS emr_investigation_orders_status_idx ON public.emr_investigation_orders(status, ordered_at DESC);

CREATE TABLE IF NOT EXISTS public.emr_investigation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.emr_investigation_orders(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  test_name text NOT NULL,
  result text NOT NULL,
  unit text,
  reference_range text,
  abnormal_flag text CHECK (abnormal_flag IN ('normal','low','high','critical','abnormal')),
  performing_facility text,
  result_date timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_investigation_results_patient_idx ON public.emr_investigation_results(patient_id, result_date DESC);

CREATE TABLE IF NOT EXISTS public.emr_imaging_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  ordering_provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  modality text NOT NULL,
  body_region text,
  indication text,
  performed_at timestamptz,
  report text,
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('laboratory','imaging','referral','discharge','external_record','consent','other')),
  title text NOT NULL,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text,
  file_size bigint,
  notes text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_documents_patient_idx ON public.emr_documents(patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.emr_care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emr_patients(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  goals text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','cancelled')),
  start_date date,
  target_date date,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_care_plans_patient_idx ON public.emr_care_plans(patient_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.emr_care_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES public.emr_care_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emr_clinical_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  encounter_id uuid REFERENCES public.emr_encounters(id) ON DELETE SET NULL,
  title text NOT NULL,
  task_type text NOT NULL DEFAULT 'follow_up',
  priority text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emr_health_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'functional_health_analysis',
  assessment_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emr_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emr_audit_logs_patient_idx ON public.emr_audit_logs(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS emr_audit_logs_user_idx ON public.emr_audit_logs(user_id, created_at DESC);

-- Link legacy structured investigation reports without duplicating them.
ALTER TABLE public.investigation_results ADD COLUMN IF NOT EXISTS emr_patient_id uuid REFERENCES public.emr_patients(id) ON DELETE SET NULL;
ALTER TABLE public.investigation_results ADD COLUMN IF NOT EXISTS emr_order_id uuid REFERENCES public.emr_investigation_orders(id) ON DELETE SET NULL;

-- Private clinical document bucket. Files are served only through authorized API routes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('emr-documents', 'emr-documents', false, 15728640, ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Direct browser access is denied. Server-side EMR APIs use the service role after RBAC checks.
ALTER TABLE public.emr_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_investigation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_investigation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_imaging_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_care_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_clinical_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_audit_logs ENABLE ROW LEVEL SECURITY;
