-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view own subscription" ON public.newsletter_subscriptions;

-- Create restrictive SELECT policy - users can only see their own subscription by email
CREATE POLICY "Users can view own subscription by email" 
ON public.newsletter_subscriptions 
FOR SELECT 
USING (email = (auth.jwt() ->> 'email'));

-- Update the UPDATE policy to be more restrictive as well
DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscriptions;

CREATE POLICY "Users can update own subscription by email" 
ON public.newsletter_subscriptions 
FOR UPDATE 
USING (email = (auth.jwt() ->> 'email'))
WITH CHECK (email = (auth.jwt() ->> 'email'));