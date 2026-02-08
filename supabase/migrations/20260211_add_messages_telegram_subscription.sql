-- Миграция для подписки на сообщения в Telegram
-- Добавляет поля user_id и send_messages в newsletter_subscriptions
-- Добавляет notification_sent_status в messages
-- Добавляет user_id в telegram_subscription_tokens

-- 1. Добавить user_id в newsletter_subscriptions (как text для совместимости с проектом)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletter_subscriptions'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.newsletter_subscriptions
    ADD COLUMN user_id text;
  END IF;
END $$;

-- 2. Добавить поле send_messages для подписки на сообщения
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletter_subscriptions'
    AND column_name = 'send_messages'
  ) THEN
    ALTER TABLE public.newsletter_subscriptions
    ADD COLUMN send_messages boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Создать уникальный индекс на user_id (NULL значения не включаются)
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscriptions_user_id
ON public.newsletter_subscriptions(user_id) WHERE user_id IS NOT NULL;

-- 4. Добавить поле notification_sent_status в messages для отслеживания отправки уведомлений
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'notification_sent_status'
  ) THEN
    ALTER TABLE public.messages
    ADD COLUMN notification_sent_status text NULL;
  END IF;
END $$;

-- 5. Индекс для быстрого поиска неотправленных уведомлений
CREATE INDEX IF NOT EXISTS idx_messages_notification_status
ON public.messages(notification_sent_status) WHERE notification_sent_status IS NULL;

-- 6. Добавить user_id в таблицу токенов подписки
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_subscription_tokens'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.telegram_subscription_tokens
    ADD COLUMN user_id text;
  END IF;
END $$;

-- 7. Обновить RLS политики для новых полей (с правильным приведением типов)

-- anyone can create subscription tokens with user_id
DROP POLICY IF EXISTS "Anyone can create subscription tokens" ON public.telegram_subscription_tokens;
CREATE POLICY "Anyone can create subscription tokens"
  ON public.telegram_subscription_tokens
  FOR INSERT
  WITH CHECK (true);

-- anyone can view own token
DROP POLICY IF EXISTS "Anyone can view own token" ON public.telegram_subscription_tokens;
CREATE POLICY "Anyone can view own token"
  ON public.telegram_subscription_tokens
  FOR SELECT
  USING (true);

-- anyone can delete own token
DROP POLICY IF EXISTS "Anyone can delete own token" ON public.telegram_subscription_tokens;
CREATE POLICY "Anyone can delete own token"
  ON public.telegram_subscription_tokens
  FOR DELETE
  USING (true);

-- Users can view own subscription by user_id or email
DROP POLICY IF EXISTS "Users can view own subscription by email" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.newsletter_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.newsletter_subscriptions
  FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users WHERE email = newsletter_subscriptions.email
    )
    OR user_id = auth.uid()::text
  );

-- Users can update own subscription
DROP POLICY IF EXISTS "Users can update own subscription by email" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.newsletter_subscriptions
  FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users WHERE email = newsletter_subscriptions.email
    )
    OR user_id = auth.uid()::text
  );

-- Add comments for documentation
COMMENT ON COLUMN public.newsletter_subscriptions.user_id IS 'User ID for direct subscription tracking';
COMMENT ON COLUMN public.newsletter_subscriptions.send_messages IS 'Enable Telegram notifications for new messages';
COMMENT ON COLUMN public.messages.notification_sent_status IS 'Telegram notification status: NULL=not sent, ok=success, error text=failed';
COMMENT ON COLUMN public.telegram_subscription_tokens.user_id IS 'User ID for messages subscription';
