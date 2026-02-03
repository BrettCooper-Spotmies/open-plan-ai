-- Issue dependencies (Issue depending on another Issue)
CREATE TABLE IF NOT EXISTS public.issue_dependencies (
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  depends_on_issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (issue_id, depends_on_issue_id),
  CONSTRAINT issue_dependencies_no_self_loop CHECK (issue_id != depends_on_issue_id)
);

-- Issue-Task dependencies (Issue depending on a Task)
CREATE TABLE IF NOT EXISTS public.issue_task_dependencies (
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (issue_id, depends_on_task_id)
);

-- Task-Issue dependencies (Task depending on an Issue)
CREATE TABLE IF NOT EXISTS public.task_issue_dependencies (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, depends_on_issue_id)
);

-- Enable RLS
ALTER TABLE public.issue_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_issue_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view issue dependencies" ON public.issue_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage issue dependencies" ON public.issue_dependencies FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view issue-task dependencies" ON public.issue_task_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage issue-task dependencies" ON public.issue_task_dependencies FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view task-issue dependencies" ON public.task_issue_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage task-issue dependencies" ON public.task_issue_dependencies FOR ALL TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_issue_deps_issue_id ON public.issue_dependencies(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_deps_depends_on ON public.issue_dependencies(depends_on_issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_task_deps_issue_id ON public.issue_task_dependencies(issue_id);
CREATE INDEX IF NOT EXISTS idx_task_issue_deps_task_id ON public.task_issue_dependencies(task_id);
