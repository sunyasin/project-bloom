-- Enable RLS on exchange table
ALTER TABLE public.exchange ENABLE ROW LEVEL SECURITY;

-- Users can view exchanges where they are creator or provider
CREATE POLICY "Users can view own exchanges" 
ON public.exchange 
FOR SELECT 
USING (
  creator IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR provider IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Users can create exchanges as creator
CREATE POLICY "Users can create exchanges" 
ON public.exchange 
FOR INSERT 
WITH CHECK (creator IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Users can update exchanges they are involved in
CREATE POLICY "Users can update own exchanges" 
ON public.exchange 
FOR UPDATE 
USING (
  creator IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR provider IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Super admins can view all exchanges
CREATE POLICY "Super admins can view all exchanges" 
ON public.exchange 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can update all exchanges
CREATE POLICY "Super admins can update all exchanges" 
ON public.exchange 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));