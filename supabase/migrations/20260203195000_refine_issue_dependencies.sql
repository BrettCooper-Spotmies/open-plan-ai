-- Add table for Task blocking Issue
CREATE TABLE IF NOT EXISTS task_blocks_issue_dependencies (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, issue_id)
);

-- Enable RLS
ALTER TABLE task_blocks_issue_dependencies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view task_blocks_issue_dependencies"
    ON task_blocks_issue_dependencies FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage task_blocks_issue_dependencies"
    ON task_blocks_issue_dependencies FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Add index
CREATE INDEX IF NOT EXISTS idx_task_blocks_issue_task ON task_blocks_issue_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_blocks_issue_issue ON task_blocks_issue_dependencies(issue_id);
