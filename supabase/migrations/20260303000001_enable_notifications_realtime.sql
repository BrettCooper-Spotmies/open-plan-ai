-- Enable realtime for notifications table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Set replica identity to full to ensure all columns are available in realtime payload
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
