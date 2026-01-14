-- Add RLS policies for user_roles table to allow super_admin to manage roles

-- Super admins can insert roles
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can update roles
CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can delete roles
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));