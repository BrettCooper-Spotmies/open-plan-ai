ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📁',
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_organization TEXT,
ADD COLUMN IF NOT EXISTS client_contact TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT '{}';

-- Update RLS if needed (usually not needed for just adding columns unless specific policies apply)
-- Ensure the columns are accessible via the existing policies
