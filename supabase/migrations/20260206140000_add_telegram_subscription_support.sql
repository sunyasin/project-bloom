-- Add Telegram support to newsletter subscriptions
-- 1. Add telegram_chat_id column
ALTER TABLE public.newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS telegram_chat_id text UNIQUE;

-- 2. Create table for temporary subscription tokens
CREATE TABLE IF NOT EXISTS public.telegram_subscription_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('common', 'producer')),
  entity_id uuid,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.telegram_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.newsletter_subscriptions(id),
  type text NOT NULL,
  entity_id uuid,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text
);

-- 4. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_token ON public.telegram_subscription_tokens(token);
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_expires ON public.telegram_subscription_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_notifications_subscription ON public.telegram_notifications(subscription_id);

-- 5. Enable RLS on new tables
ALTER TABLE public.telegram_subscription_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for telegram_subscription_tokens
-- Allow anyone to create tokens (for frontend)
CREATE POLICY "Anyone can create subscription tokens"
ON public.telegram_subscription_tokens
FOR INSERT
WITH CHECK (true);

-- Allow anyone to select their own token by token
CREATE POLICY "Anyone can view own token"
ON public.telegram_subscription_tokens
FOR SELECT
USING (true);

-- Allow anyone to delete their own token (bot does this after confirmation)
CREATE POLICY "Anyone can delete own token"
ON public.telegram_subscription_tokens
FOR DELETE
USING (true);

-- 7. RLS policies for telegram_notifications
-- Allow anyone to view notifications
CREATE POLICY "Anyone can view notifications"
ON public.telegram_notifications
FOR SELECT
USING (true);

-- Allow anyone to insert notifications
CREATE POLICY "Anyone can insert notifications"
ON public.telegram_notifications
FOR INSERT
WITH CHECK (true);

-- 8. Add comments for documentation
COMMENT ON TABLE public.telegram_subscription_tokens IS 'Temporary tokens for Telegram subscription confirmation';
COMMENT ON TABLE public.telegram_notifications IS 'Track sent Telegram notifications for delivery status';
COMMENT ON COLUMN public.newsletter_subscriptions.telegram_chat_id IS 'Telegram Chat ID for notifications';
