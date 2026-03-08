-- Migration: Add multi-module support to tasks
-- Description: Adds a module_ids array column to support multiple modules per task and migrates existing data.

-- 1. Add the new module_ids column
ALTER TABLE tasks ADD COLUMN module_ids UUID[] DEFAULT '{}';

-- 2. Migrate existing module_id data to the new array column
UPDATE tasks SET module_ids = ARRAY[module_id] WHERE module_id IS NOT NULL;

-- 3. Create index for the new column (GIN index for array search performance)
CREATE INDEX idx_tasks_module_ids ON tasks USING GIN (module_ids);

-- 4. (Optional) Keep module_id for backward compatibility if needed, 
-- or we can drop it later once the frontend is fully updated.
-- For now, let's keep it but ideally, we should transition fully to module_ids.
