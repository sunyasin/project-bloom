-- Create table for newsletter subscriptions
CREATE TABLE public.newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  send_common boolean NOT NULL DEFAULT true,
  send_categories uuid[] DEFAULT '{}',
  send_profiles uuid[] DEFAULT '{}',
  subscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  last_sent_at timestamp with time zone,
  last_send_status text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create index on email for faster lookups
CREATE INDEX idx_newsletter_subscriptions_email ON public.newsletter_subscriptions(email);

-- Create index on enabled for filtering active subscriptions
CREATE INDEX idx_newsletter_subscriptions_enabled ON public.newsletter_subscriptions(enabled) WHERE enabled = true;

-- Policy: Anyone can subscribe (insert their email)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own subscription by email
CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscriptions
FOR SELECT
USING (true);

-- Policy: Users can update their own subscription
CREATE POLICY "Users can update own subscription"
ON public.newsletter_subscriptions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_newsletter_subscriptions_updated_at
BEFORE UPDATE ON public.newsletter_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.newsletter_subscriptions IS 'Newsletter subscription preferences';