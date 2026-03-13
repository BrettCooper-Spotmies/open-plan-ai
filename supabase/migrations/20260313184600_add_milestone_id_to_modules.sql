-- Migration: Add milestone_id to modules
-- Description: Adds a milestone_id foreign key to the modules table to support linking modules to milestones.

-- 1. Add milestone_id column
ALTER TABLE modules ADD COLUMN milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX idx_modules_milestone_id ON modules(milestone_id);
