-- Create project_links table for storing external links
CREATE TABLE public.project_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX idx_project_links_project_id ON public.project_links(project_id);

-- Enable Row Level Security
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view links in accessible projects"
ON public.project_links FOR SELECT
USING (has_project_access(project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create links in accessible projects"
ON public.project_links FOR INSERT
WITH CHECK (has_project_access(project_id));

CREATE POLICY "Users can update links in accessible projects"
ON public.project_links FOR UPDATE
USING (has_project_access(project_id));

CREATE POLICY "Users can delete links in accessible projects"
ON public.project_links FOR DELETE
USING (has_project_access(project_id));