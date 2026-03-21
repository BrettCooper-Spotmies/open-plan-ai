-- Returns recent activities for a single organization only.
-- Security: user must have access to the organization.

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
		AND public.has_org_access(_org_id)
	ORDER BY a.created_at DESC
	LIMIT GREATEST(1, LEAST(COALESCE(_limit, 10), 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_org_activities(uuid, int) TO authenticated;

