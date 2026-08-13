-- Append-only audit trail for non-clinical dashboard activity.
-- Clinical events continue to use emr_audit_logs and are combined in the UI.

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_role text,
  action text NOT NULL,
  module text NOT NULL,
  entity_type text,
  entity_id text,
  description text NOT NULL,
  outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'denied', 'failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_logs_user_idx ON public.admin_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_logs_subject_user_idx ON public.admin_activity_logs(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_logs_module_idx ON public.admin_activity_logs(module, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_logs_created_idx ON public.admin_activity_logs(created_at DESC);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- No browser policies are created. Dashboard audit data is available only
-- through server routes after an Administrator permission check.
REVOKE ALL ON public.admin_activity_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_admin_activity_log_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Admin activity logs are append-only.';
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_activity_logs ON public.admin_activity_logs;
CREATE TRIGGER protect_admin_activity_logs
BEFORE UPDATE OR DELETE ON public.admin_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_activity_log_changes();
