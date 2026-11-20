-- Make the clinical audit log append-only.
--
-- emr_audit_logs records who viewed and changed each chart, and since
-- migration 021 it also holds the previous version of every edited clinical
-- note. For it to stand as a medico-legal record (and for NDPA
-- accountability) no row may be edited or deleted once written, as with
-- admin_activity_logs (migration 017).
--
-- One exception: the table's foreign keys are ON DELETE SET NULL, so removing
-- a staff account or a patient clears user_id / patient_id on their audit
-- rows. That update is allowed when it changes nothing else, so those
-- deletions keep working and the audit trail itself is never rewritten.

CREATE OR REPLACE FUNCTION public.prevent_emr_audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.id = OLD.id
    AND NEW.action = OLD.action
    AND NEW.entity_type = OLD.entity_type
    AND NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id
    AND NEW.user_email IS NOT DISTINCT FROM OLD.user_email
    AND NEW.metadata = OLD.metadata
    AND NEW.created_at = OLD.created_at
    AND (NEW.user_id IS NOT DISTINCT FROM OLD.user_id OR NEW.user_id IS NULL)
    AND (NEW.patient_id IS NOT DISTINCT FROM OLD.patient_id OR NEW.patient_id IS NULL)
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'EMR audit logs are append-only.';
END;
$$;

DROP TRIGGER IF EXISTS protect_emr_audit_logs ON public.emr_audit_logs;
CREATE TRIGGER protect_emr_audit_logs
BEFORE UPDATE OR DELETE ON public.emr_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_emr_audit_log_changes();

-- No browser access: written and read only by server routes (lib/emr.ts).
REVOKE ALL ON public.emr_audit_logs FROM anon, authenticated;

-- The chart's note version history looks revisions up by patient and action.
CREATE INDEX IF NOT EXISTS emr_audit_logs_revisions_idx
  ON public.emr_audit_logs(patient_id, action, created_at DESC);
