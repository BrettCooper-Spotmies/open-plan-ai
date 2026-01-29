-- Add icon column to projects table for storing emoji icons
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📁';
