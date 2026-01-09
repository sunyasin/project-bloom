-- Allow authenticated users to read all profiles (for transfer recipient selection)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);