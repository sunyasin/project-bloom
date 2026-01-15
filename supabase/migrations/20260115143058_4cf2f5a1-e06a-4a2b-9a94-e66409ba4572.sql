-- Enable RLS on coins table
ALTER TABLE public.coins ENABLE ROW LEVEL SECURITY;

-- Users can view only their own coin records
CREATE POLICY "Users can view own coins" 
ON public.coins 
FOR SELECT 
USING (who IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Super admins can view all coin records
CREATE POLICY "Super admins can view all coins" 
ON public.coins 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));