-- Add due_date column to issues table
-- Run this in the Supabase SQL Editor

ALTER TABLE issues ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN issues.due_date IS 'Due date for the issue resolution';

-- Reload the PostgREST schema cache so the new column is recognized
NOTIFY pgrst, 'reload schema';
