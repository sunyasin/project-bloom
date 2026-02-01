-- Allow all authenticated users to find super_admin user_id
-- This is needed for wallet "receive" functionality to send coin requests to admin
-- Using SECURITY DEFINER function to bypass RLS for this specific check

CREATE OR REPLACE FUNCTION public.find_super_admin()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT user_id INTO v_admin_id
    FROM public.user_roles
    WHERE role = 'super_admin'
    LIMIT 1;

    RETURN v_admin_id;
END;
$$;

-- Create a view for super_admin lookup that bypasses RLS
CREATE OR REPLACE VIEW public.super_admin_lookup AS
SELECT user_id FROM public.user_roles WHERE role = 'super_admin';

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.super_admin_lookup TO authenticated;

-- Policy to allow reading from the view (bypasses table RLS)
CREATE POLICY "All users can view super_admin from lookup"
ON public.super_admin_lookup
FOR SELECT
TO authenticated
USING (true);
