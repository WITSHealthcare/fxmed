-- Anyone who gives the site their name, email or phone belongs in Contacts.
-- Migration 031 covers the patient registration form; this covers every other
-- place those details are collected: appointment bookings (booking forms and
-- Zara), inbox messages (contact form, health assessment quiz, Zara enquiries),
-- functional health analyses, ambassador applications and ambassador referrals.
-- It also covers the people staff enter themselves: CRM patients and EMR
-- patients.
--
-- As in 031: one contact per submission or record, written in the same
-- transaction as it, and never rewritten afterwards, so staff notes and
-- statuses on a contact are not overwritten.
BEGIN;

-- The contact form has no phone field and Zara treats the phone as optional.
ALTER TABLE public.contacts ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_id uuid
    REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS health_assessment_id uuid
    REFERENCES public.emr_health_assessments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ambassador_application_id uuid
    REFERENCES public.ambassador_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ambassador_referral_id uuid
    REFERENCES public.ambassador_referrals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_patient_id text
    REFERENCES public.crm_patients(id) ON DELETE SET NULL,
  -- The contact is a copy of this patient. The reverse link,
  -- emr_patients.contact_id, means the patient was created from that contact.
  ADD COLUMN IF NOT EXISTS emr_patient_id uuid
    REFERENCES public.emr_patients(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_appointment_idx
  ON public.contacts(appointment_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_message_idx
  ON public.contacts(message_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_health_assessment_idx
  ON public.contacts(health_assessment_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_ambassador_application_idx
  ON public.contacts(ambassador_application_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_ambassador_referral_idx
  ON public.contacts(ambassador_referral_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_crm_patient_idx
  ON public.contacts(crm_patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_emr_patient_idx
  ON public.contacts(emr_patient_id);

-- One mapping per source, shared by the insert trigger and the backfill below
-- so the two cannot drift apart. The contact's starting status reflects how far
-- the submission had already been dealt with when it was copied. The id is
-- text because crm_patients, unlike the other sources, is not keyed by uuid.
CREATE OR REPLACE FUNCTION public.mirror_submission_to_contact(origin text, origin_id text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  birth_date_text text;
  birth_date date;
BEGIN
  IF origin = 'appointments' THEN
    INSERT INTO public.contacts (
      appointment_id, full_name, phone, email, address, health_concern,
      outreach_event, status, created_at
    )
    SELECT
      a.id,
      coalesce(nullif(concat_ws(' ', nullif(trim(a.first_name), ''), nullif(trim(a.last_name), '')), ''), 'Unknown'),
      nullif(trim(a.phone), ''), nullif(trim(a.email), ''), a.home_address, a.symptoms,
      'Appointment booking',
      CASE
        WHEN a.patient_id IS NOT NULL THEN 'enrolled'
        WHEN a.status IN ('confirmed', 'completed') THEN 'contacted'
        WHEN a.status = 'cancelled' THEN 'archived'
        ELSE 'new'
      END,
      coalesce(a.created_at, now())
    FROM public.appointments a
    WHERE a.id = origin_id::uuid
    ON CONFLICT (appointment_id) DO NOTHING;

  ELSIF origin = 'messages' THEN
    -- A functional health analysis also writes an inbox message. The analysis
    -- itself is mirrored below with more detail, so its message is skipped.
    -- Zara enquiries carry no source of their own, only their subject.
    INSERT INTO public.contacts (
      message_id, full_name, phone, email, health_concern,
      outreach_event, status, created_at
    )
    SELECT
      m.id,
      coalesce(nullif(trim(m.name), ''), 'Website visitor'),
      nullif(trim(m.phone), ''), nullif(trim(m.email), ''),
      CASE WHEN m.source = 'health_assessment' THEN m.subject ELSE left(m.message, 500) END,
      CASE
        WHEN m.source = 'health_assessment' THEN 'Health assessment'
        WHEN m.subject = 'Enquiry via Zara' THEN 'Zara enquiry'
        ELSE 'Contact form'
      END,
      CASE m.status WHEN 'unread' THEN 'new' WHEN 'archived' THEN 'archived' ELSE 'contacted' END,
      coalesce(m.created_at, now())
    FROM public.messages m
    WHERE m.id = origin_id::uuid
      AND m.source <> 'functional_health_analysis'
      AND coalesce(m.subject, '') NOT ILIKE 'functional health analysis:%'
    ON CONFLICT (message_id) DO NOTHING;

  ELSIF origin = 'emr_health_assessments' THEN
    -- The answers are free-form JSON. A date that cannot be read must not fail
    -- the submission, so it is dropped instead.
    SELECT h.assessment_data->'personalInfo'->>'dateOfBirth' INTO birth_date_text
      FROM public.emr_health_assessments h
     WHERE h.id = origin_id::uuid;
    IF birth_date_text ~ '^\d{4}-\d{2}-\d{2}$' THEN
      BEGIN
        birth_date := birth_date_text::date;
      EXCEPTION WHEN others THEN
        birth_date := NULL;
      END;
    END IF;

    INSERT INTO public.contacts (
      health_assessment_id, full_name, phone, email, gender, date_of_birth,
      health_concern, conditions, medications, outreach_event, status, created_at
    )
    SELECT
      h.id,
      coalesce(nullif(concat_ws(' ', nullif(trim(person->>'firstName'), ''), nullif(trim(person->>'lastName'), '')), ''), 'Website visitor'),
      nullif(trim(person->>'phone'), ''), nullif(trim(person->>'email'), ''),
      nullif(trim(person->>'gender'), ''), birth_date,
      nullif(trim(h.assessment_data->'healthConcerns'->>'primaryConcern'), ''),
      nullif(trim(h.assessment_data->'medicalHistory'->>'conditions'), ''),
      nullif(trim(h.assessment_data->'medicalHistory'->>'medications'), ''),
      'Functional health analysis',
      CASE
        WHEN h.patient_id IS NOT NULL THEN 'enrolled'
        WHEN h.status = 'new' THEN 'new'
        ELSE 'contacted'
      END,
      h.submitted_at
    FROM public.emr_health_assessments h
    CROSS JOIN LATERAL (SELECT h.assessment_data->'personalInfo' AS person) personal
    WHERE h.id = origin_id::uuid
      AND coalesce(nullif(trim(person->>'email'), ''), nullif(trim(person->>'phone'), '')) IS NOT NULL
    ON CONFLICT (health_assessment_id) DO NOTHING;

  ELSIF origin = 'ambassador_applications' THEN
    INSERT INTO public.contacts (
      ambassador_application_id, full_name, phone, email, gender, city, state,
      outreach_event, status, created_at
    )
    SELECT
      a.id, concat_ws(' ', a.first_name, a.last_name), a.phone, a.email,
      a.gender, a.city, a.state_region,
      'Ambassador application',
      CASE a.status WHEN 'approved' THEN 'contacted' WHEN 'rejected' THEN 'archived' ELSE 'new' END,
      a.created_at
    FROM public.ambassador_applications a
    WHERE a.id = origin_id::uuid
    ON CONFLICT (ambassador_application_id) DO NOTHING;

  ELSIF origin = 'ambassador_referrals' THEN
    INSERT INTO public.contacts (
      ambassador_referral_id, full_name, phone, email, health_concern,
      outreach_event, status, created_at
    )
    SELECT
      r.id, concat_ws(' ', r.first_name, r.last_name), r.phone, r.email, r.notes,
      'Ambassador referral',
      CASE r.status
        WHEN 'submitted' THEN 'new'
        WHEN 'converted' THEN 'enrolled'
        WHEN 'declined' THEN 'archived'
        ELSE 'contacted'
      END,
      r.created_at
    FROM public.ambassador_referrals r
    WHERE r.id = origin_id::uuid
    ON CONFLICT (ambassador_referral_id) DO NOTHING;

  ELSIF origin = 'crm_patients' THEN
    -- Stage spellings vary between the dashboard and older rows
    -- ("Follow Up" / "Follow-Up", "Enrolment" / "Enrollment").
    INSERT INTO public.contacts (
      crm_patient_id, full_name, phone, email, health_concern,
      outreach_event, status, created_at
    )
    SELECT
      c.id, coalesce(nullif(trim(c.name), ''), 'Unknown'),
      nullif(trim(c.phone), ''), nullif(trim(c.email), ''), nullif(trim(c.program), ''),
      'CRM patient',
      CASE
        WHEN c.stage ILIKE 'follow%' THEN 'contacted'
        WHEN c.stage ILIKE 'enrol%' OR c.stage ILIKE 'onboard%' OR c.stage ILIKE 'active' THEN 'enrolled'
        ELSE 'new'
      END,
      c.created_at
    FROM public.crm_patients c
    WHERE c.id = origin_id
    ON CONFLICT (crm_patient_id) DO NOTHING;

  ELSIF origin = 'emr_patients' THEN
    -- Only patients entered straight into the EMR are copied. One created from
    -- a Contacts entry, a CRM record or an approved registration is already
    -- here under that entry. Approval links the registration to the patient
    -- just after inserting it, which is why this table's trigger is deferred.
    INSERT INTO public.contacts (
      emr_patient_id, full_name, phone, email, gender, date_of_birth,
      marital_status, address, city, state, outreach_event, status, created_at
    )
    SELECT
      p.id, concat_ws(' ', p.first_name, nullif(p.middle_name, ''), p.last_name),
      nullif(trim(p.phone), ''), nullif(trim(p.email), ''), p.sex, p.date_of_birth,
      p.marital_status, p.address, p.city, p.state,
      'EMR patient',
      CASE p.status WHEN 'active' THEN 'enrolled' ELSE 'archived' END,
      p.created_at
    FROM public.emr_patients p
    WHERE p.id = origin_id::uuid
      AND p.contact_id IS NULL
      AND p.crm_patient_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.emr_patient_registration_requests r
         WHERE r.linked_patient_id = p.id AND r.status = 'approved'
      )
    ON CONFLICT (emr_patient_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mirror_submission_to_contact_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.mirror_submission_to_contact(TG_TABLE_NAME::text, NEW.id::text);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mirror_submission_to_contact(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mirror_submission_to_contact_on_insert()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS appointment_contact_insert ON public.appointments;
CREATE TRIGGER appointment_contact_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.mirror_submission_to_contact_on_insert();

DROP TRIGGER IF EXISTS message_contact_insert ON public.messages;
CREATE TRIGGER message_contact_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.mirror_submission_to_contact_on_insert();

DROP TRIGGER IF EXISTS health_assessment_contact_insert ON public.emr_health_assessments;
CREATE TRIGGER health_assessment_contact_insert
  AFTER INSERT ON public.emr_health_assessments
  FOR EACH ROW EXECUTE FUNCTION public.mirror_submission_to_contact_on_insert();

DROP TRIGGER IF EXISTS ambassador_application_contact_insert ON public.ambassador_applications;
CREATE TRIGGER ambassador_application_contact_insert
  AFTER INSERT ON public.ambassador_applications
  FOR EACH ROW EXECUTE FUNCTION public.mirror_submission_to_contact_on_insert();

DROP TRIGGER IF EXISTS ambassador_referral_contact_insert ON public.ambassador_referrals;
CREATE TRIGGER ambassador_referral_contact_insert
  AFTER INSERT ON public.ambassador_referrals
  FOR EACH ROW EXECUTE FUNCTION public.mirror_submission_to_contact_on_insert();

DROP TRIGGER IF EXISTS crm_patient_contact_insert ON public.crm_patients;
CREATE TRIGGER crm_patient_contact_insert
  AFTER INSERT ON public.crm_patients
  FOR EACH ROW EXECUTE FUNCTION public.mirror_submission_to_contact_on_insert();

-- Runs at commit rather than straight after the insert, so that a patient
-- created by approving a registration is already linked to it by then.
DROP TRIGGER IF EXISTS emr_patient_contact_insert ON public.emr_patients;
CREATE CONSTRAINT TRIGGER emr_patient_contact_insert
  AFTER INSERT ON public.emr_patients
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.mirror_submission_to_contact_on_insert();

-- Bring in everything submitted or entered before these triggers existed.
DO $$
BEGIN
  PERFORM public.mirror_submission_to_contact('appointments', id::text) FROM public.appointments;
  PERFORM public.mirror_submission_to_contact('messages', id::text) FROM public.messages;
  PERFORM public.mirror_submission_to_contact('emr_health_assessments', id::text) FROM public.emr_health_assessments;
  PERFORM public.mirror_submission_to_contact('ambassador_applications', id::text) FROM public.ambassador_applications;
  PERFORM public.mirror_submission_to_contact('ambassador_referrals', id::text) FROM public.ambassador_referrals;
  PERFORM public.mirror_submission_to_contact('crm_patients', id) FROM public.crm_patients;
  PERFORM public.mirror_submission_to_contact('emr_patients', id::text) FROM public.emr_patients;
END $$;

COMMIT;
