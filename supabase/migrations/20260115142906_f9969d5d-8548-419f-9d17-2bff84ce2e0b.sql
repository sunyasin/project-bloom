-- Allow super_admin to view all newsletter subscriptions
CREATE POLICY "Super admins can view all subscriptions" 
ON public.newsletter_subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));