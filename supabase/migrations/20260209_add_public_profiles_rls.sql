-- Add public read access to profiles for viewing event initiators
-- This allows unauthenticated users to see author names on events

-- Enable RLS on profiles if not already enabled
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to basic profile info
-- Using SELECT with check to allow anyone to view profiles
CREATE POLICY "Public profiles are readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
