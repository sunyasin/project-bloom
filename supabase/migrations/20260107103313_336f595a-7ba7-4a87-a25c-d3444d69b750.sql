-- Disable RLS for coins table
ALTER TABLE public.coins DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own coins" ON public.coins;
DROP POLICY IF EXISTS "Users can insert own coins" ON public.coins;