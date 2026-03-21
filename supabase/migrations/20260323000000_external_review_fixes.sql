-- =============================================================================
-- Migration: 20260323000000_external_review_fixes.sql
-- Purpose  : Resolve all High-Risk findings from the external AI Code Review.
--            All statements are fully idempotent (safe to re-run).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. COMPOSITE INDEXES for get_dashboard_stats aggregation queries
--    (External review flagged missing indexes on projects, tasks, issues)
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow fast COUNT(*) in get_dashboard_stats for active projects
CREATE INDEX IF NOT EXISTS idx_projects_org_deleted
  ON public.projects (organization_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Allow fast aggregation of tasks per org (joining via projects)
CREATE INDEX IF NOT EXISTS idx_tasks_project_deleted_status
  ON public.tasks (project_id, deleted_at, status)
  WHERE deleted_at IS NULL;

-- Allow fast aggregation of issues per org
CREATE INDEX IF NOT EXISTS idx_issues_project_deleted_status
  ON public.issues (project_id, deleted_at, status)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COMPOSITE INDEX for has_project_access performance
--    (External review: nested EXISTS clauses degrade on large datasets)
-- ─────────────────────────────────────────────────────────────────────────────

-- Speeds up organization_members lookup inside has_project_access
CREATE INDEX IF NOT EXISTS idx_org_members_user_org
  ON public.organization_members (user_id, organization_id);

-- Speeds up project_members lookup inside has_project_access
CREATE INDEX IF NOT EXISTS idx_project_members_user_project
  ON public.project_members (user_id, project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AUTH_ERROR_LOGS: Add INSERT policy for service_role so logs can be written
--    (External review: auth_error_logs had no INSERT policy)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service role can insert error logs" ON public.auth_error_logs;
CREATE POLICY "Service role can insert error logs"
  ON public.auth_error_logs FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HARDEN get_dashboard_stats: Use generic error message to avoid leaking
--    implementation details (External review finding on RAISE EXCEPTION)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_org_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_access BOOLEAN;
    v_active_projects INT;
    v_total_tasks INT;
    v_completed_tasks INT;
    v_open_issues INT;
    v_team_members INT;
    v_overdue_items INT;
    v_in_progress_tasks INT;
BEGIN
    -- Validate caller is a member (generic error to prevent info disclosure)
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_org_id AND user_id = auth.uid()
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Unauthorized'; -- Generic message, no implementation leakage
    END IF;

    -- Active projects (now uses idx_projects_org_deleted)
    SELECT COUNT(*) INTO v_active_projects
    FROM public.projects
    WHERE organization_id = p_org_id AND deleted_at IS NULL;

    IF v_active_projects = 0 THEN
        RETURN jsonb_build_object(
            'activeProjects', 0, 'totalTasks', 0, 'completedTasks', 0,
            'openIssues', 0, 'teamMembers', 0, 'overdueItems', 0, 'inProgressTasks', 0
        );
    END IF;

    -- Task stats (now uses idx_tasks_project_deleted_status)
    SELECT
        COUNT(t.id),
        COUNT(t.id) FILTER (WHERE t.status = 'done'),
        COUNT(t.id) FILTER (WHERE t.status = 'in-progress'),
        COUNT(t.id) FILTER (WHERE t.status != 'done' AND t.due_date < CURRENT_DATE)
    INTO v_total_tasks, v_completed_tasks, v_in_progress_tasks, v_overdue_items
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE p.organization_id = p_org_id
      AND p.deleted_at IS NULL
      AND t.deleted_at IS NULL;

    -- Open issues (now uses idx_issues_project_deleted_status)
    SELECT COUNT(i.id) INTO v_open_issues
    FROM public.issues i
    JOIN public.projects p ON p.id = i.project_id
    WHERE p.organization_id = p_org_id
      AND p.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND i.status IN ('open', 'investigating');

    -- Team members
    SELECT COUNT(*) INTO v_team_members
    FROM public.organization_members
    WHERE organization_id = p_org_id;

    RETURN jsonb_build_object(
        'activeProjects', v_active_projects,
        'totalTasks', v_total_tasks,
        'completedTasks', v_completed_tasks,
        'openIssues', v_open_issues,
        'teamMembers', v_team_members,
        'overdueItems', v_overdue_items,
        'inProgressTasks', v_in_progress_tasks
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NOTIFICATION DEDUPLICATION: Extend window from 30s to 60s and normalize
--    whitespace in description comparison to catch near-duplicate notifications
--    (External review: 30s is too short for high-frequency operations)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_activity_broadcast_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    IF NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT p.organization_id INTO v_org_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;

    IF v_org_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        title,
        description,
        project_id
    )
    SELECT
        om.user_id,
        NEW.user_id,
        'activity'::public.notification_type,
        'New Activity',
        NEW.description,
        NEW.project_id
    FROM public.organization_members om
    WHERE om.organization_id = v_org_id
      AND om.user_id != COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = om.user_id
          AND n.project_id = NEW.project_id
          -- Normalize whitespace to catch near-duplicates
          AND TRIM(n.description) = TRIM(NEW.description)
          AND n.created_at > (NOW() - INTERVAL '60 seconds') -- Extended from 30s
    )
    LIMIT 1500;

    RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PROJECT NAME LENGTH CONSTRAINT
--    (External review: excessively long project name found in diagnostic data)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'projects'
      AND constraint_name = 'chk_project_name_length'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT chk_project_name_length CHECK (char_length(name) <= 150);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'projects'
      AND constraint_name = 'chk_project_description_length'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT chk_project_description_length CHECK (char_length(description) <= 5000);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. NOTIFICATION INDEX ENHANCEMENT: ensure covering index includes all columns
--    used in the NOT EXISTS deduplication query above
--    (External review: existing index may not fully cover the NOT EXISTS query)
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_notifications_user_project_desc;
CREATE INDEX IF NOT EXISTS idx_notifications_dedup
  ON public.notifications (user_id, project_id, created_at DESC)
  INCLUDE (description);
