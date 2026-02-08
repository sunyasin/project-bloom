-- Add RLS policies for categories table to allow super_admin and moderator to manage categories

-- Enable RLS if not already enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy for selecting categories (authenticated users can view)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for inserting categories (only super_admin and moderator can create)
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- Create policy for updating categories (only super_admin and moderator can update)
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'moderator') OR 
    public.has_role(auth.uid(), 'super_admin')
  );
