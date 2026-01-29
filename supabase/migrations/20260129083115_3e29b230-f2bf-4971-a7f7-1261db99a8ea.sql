-- Create IP rate limits table for edge function abuse prevention
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_ip_rate_limits_lookup 
  ON public.ip_rate_limits (ip_address, endpoint, created_at DESC);

-- Enable RLS - only service role can access
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only policy for all operations
CREATE POLICY "Service role can manage IP rate limits"
  ON public.ip_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.ip_rate_limits
  WHERE created_at < NOW() - INTERVAL '2 hours';
END;
$$;