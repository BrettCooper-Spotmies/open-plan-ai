-- Broaden activity visibility for legitimate organization participants.
-- This keeps org scoping but allows users who are project members in the org.

CREATE OR REPLACE FUNCTION public.get_recent_org_activities(
	_org_id uuid,
	_limit int DEFAULT 10
)
RETURNS SETOF public.activities
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT a.*
	FROM public.activities a
	JOIN public.projects p ON p.id = a.project_id
	WHERE p.organization_id = _org_id
		AND p.deleted_at IS NULL
		AND (
			EXISTS (
				SELECT 1
				FROM public.organization_members om
				WHERE om.organization_id = _org_id
					AND om.user_id = auth.uid()
			)
			OR EXISTS (
				SELECT 1
				FROM public.project_members pm
				JOIN public.projects p2 ON p2.id = pm.project_id
				WHERE p2.organization_id = _org_id
					AND p2.deleted_at IS NULL
					AND pm.user_id = auth.uid()
			)
		)
	ORDER BY a.created_at DESC
	LIMIT GREATEST(1, LEAST(COALESCE(_limit, 10), 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_org_activities(uuid, int) TO authenticated;

