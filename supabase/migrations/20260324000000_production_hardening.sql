-- =============================================================================
-- Migration: 20260324000000_production_hardening.sql
-- Purpose  : Improve production readiness across Data Integrity, Compliance,
--            Performance, and Observability categories.
--            All statements are idempotent (safe to re-run).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. UPDATED_AT AUTO-TRIGGER
--    Ensures updated_at is always current server time on any row update.
--    Applies to all core tables that have an updated_at column.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to tables that have updated_at (idempotent DROP IF EXISTS + CREATE)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects', 'tasks', 'issues', 'modules', 'milestones',
    'profiles', 'organizations', 'team_invitations', 'notifications'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I',
      tbl
    );
    -- Only create if the table exists and has updated_at
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADMIN AUDIT LOG TABLE
--    Records sensitive admin actions: role changes, member removal, org deletion.
--    Required for SOC2 / compliance audit trails.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                 -- e.g. 'member_removed', 'role_changed'
  entity_type TEXT NOT NULL,                 -- e.g. 'organization', 'project', 'user'
  entity_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',   -- before/after values, context
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can write; org admins can read their own org's audit log
DROP POLICY IF EXISTS "Service role can write audit log" ON public.admin_audit_log;
CREATE POLICY "Service role can write audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Org admins/owners can read audit entries for their own org
DROP POLICY IF EXISTS "Org admins can read their audit log" ON public.admin_audit_log;
CREATE POLICY "Org admins can read their audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = (metadata->>'organization_id')::uuid
        AND om.role IN ('admin', 'owner')
    )
  );

-- Index for fast per-org lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_org
  ON public.admin_audit_log USING GIN ((metadata->'organization_id'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON public.admin_audit_log (actor_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CLIENT ERROR LOG TABLE
--    Receives error payloads from the browser's logger.sendToLogSink()
--    via the log-client-error edge function.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  context       JSONB NOT NULL DEFAULT '{}',
  page_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can write/read client error logs
DROP POLICY IF EXISTS "Service role only on client_error_logs" ON public.client_error_logs;
CREATE POLICY "Service role only on client_error_logs"
  ON public.client_error_logs FOR ALL
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Auto-purge rows older than 30 days to prevent unbounded growth
CREATE INDEX IF NOT EXISTS idx_client_error_logs_created
  ON public.client_error_logs (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DATA RETENTION POLICY
--    RPC to purge soft-deleted rows older than the retention window.
--    Can be called from a pg_cron job or a scheduled edge function.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purge_expired_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention_days INT := 90;  -- Soft-deleted rows survive 90 days before hard delete
  v_log_retention_days INT := 30;
  v_result JSONB := '{}';
  v_count INT;
BEGIN
  -- Only allow service_role to call this
  IF auth.jwt()->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Purge soft-deleted projects
  DELETE FROM public.projects
  WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - (v_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('purged_projects', v_count);

  -- Purge soft-deleted tasks
  DELETE FROM public.tasks
  WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - (v_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('purged_tasks', v_count);

  -- Purge soft-deleted issues
  DELETE FROM public.issues
  WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - (v_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('purged_issues', v_count);

  -- Purge expired invitations (status != pending after expiry)
  DELETE FROM public.team_invitations
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND status IN ('expired', 'cancelled');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('purged_invitations', v_count);

  -- Purge old client error logs
  DELETE FROM public.client_error_logs
  WHERE created_at < NOW() - (v_log_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('purged_client_errors', v_count);

  -- Purge old auth error logs
  DELETE FROM public.auth_error_logs
  WHERE created_at < NOW() - (v_log_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('purged_auth_errors', v_count);

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_data() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PERFORMANCE — Additional indexes for common query patterns
-- ─────────────────────────────────────────────────────────────────────────────

-- Tasks by project + status (used by project detail view)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
  ON public.tasks (project_id, status)
  WHERE deleted_at IS NULL;

-- Issues by project + status (used by project detail view)
CREATE INDEX IF NOT EXISTS idx_issues_project_status
  ON public.issues (project_id, status)
  WHERE deleted_at IS NULL;

-- Notifications by user + read status (used by notification bell)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications (user_id, read, created_at DESC)
  WHERE read = false;

-- Team invitations by email + status (used by dashboard invite acceptance)
CREATE INDEX IF NOT EXISTS idx_team_invitations_email_status
  ON public.team_invitations (email, status, expires_at)
  WHERE status = 'pending';

-- Activities by project (used by activity feed)
CREATE INDEX IF NOT EXISTS idx_activities_project_created
  ON public.activities (project_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER: Log member removal and role changes to admin_audit_log
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_member_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      COALESCE(auth.uid(), NEW.user_id),
      'role_changed',
      'organization_member',
      NEW.user_id,
      jsonb_build_object(
        'organization_id', NEW.organization_id,
        'from_role', OLD.role,
        'to_role', NEW.role
      )
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      COALESCE(auth.uid(), OLD.user_id),
      'member_removed',
      'organization_member',
      OLD.user_id,
      jsonb_build_object(
        'organization_id', OLD.organization_id,
        'removed_role', OLD.role
      )
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_member_role_change ON public.organization_members;
CREATE TRIGGER trg_log_member_role_change
  AFTER UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.log_member_role_change();
