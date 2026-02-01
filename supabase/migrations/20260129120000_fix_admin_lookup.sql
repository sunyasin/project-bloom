-- Allow all authenticated users to find super_admin user_id
-- Using SECURITY DEFINER function to bypass RLS

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.find_super_admin();

-- Create function that finds super_admin (runs with owner privileges, bypassing RLS)
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

-- Grant execute on function to authenticated users
GRANT EXECUTE ON FUNCTION public.find_super_admin() TO authenticated;
