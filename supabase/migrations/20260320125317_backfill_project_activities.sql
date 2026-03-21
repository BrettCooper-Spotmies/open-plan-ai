-- Backfill project activity rows for projects that have no project-level activity yet.

INSERT INTO public.activities (
	project_id,
	user_id,
	activity_type,
	entity_type,
	entity_id,
	description,
	metadata,
	created_at
)
SELECT
	p.id AS project_id,
	p.created_by AS user_id,
	'project_created'::public.activity_type AS activity_type,
	'project' AS entity_type,
	p.id AS entity_id,
	'created project "' || p.name || '"' AS description,
	'{}'::jsonb AS metadata,
	COALESCE(p.created_at, NOW()) AS created_at
FROM public.projects p
WHERE p.deleted_at IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM public.activities a
		WHERE a.project_id = p.id
			AND a.entity_type = 'project'
			AND a.entity_id = p.id
	);

