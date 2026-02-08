-- Исправление таблицы telegram_subscription_tokens
-- 1. Удалить CHECK constraint который ограничивал типы подписки
ALTER TABLE public.telegram_subscription_tokens
DROP CONSTRAINT IF EXISTS telegram_subscription_tokens_type_check;

-- 2. Добавить поле user_id если его нет (для подписки на сообщения)
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

-- 3. Увеличить срок действия токена до 7 дней
ALTER TABLE public.telegram_subscription_tokens
ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- 4. Обновить RLS политику для INSERT с новыми типами
DROP POLICY IF EXISTS "Anyone can create subscription tokens" ON public.telegram_subscription_tokens;
CREATE POLICY "Anyone can create subscription tokens"
  ON public.telegram_subscription_tokens
  FOR INSERT
  WITH CHECK (true);

-- 5. Удалить NOT NULL constraint с email (для подписок через Telegram)
ALTER TABLE public.newsletter_subscriptions
ALTER COLUMN email DROP NOT NULL;

-- Добавить комментарии для документации
COMMENT ON TABLE public.telegram_subscription_tokens IS 'Temporary tokens for Telegram subscription confirmation';
COMMENT ON COLUMN public.telegram_subscription_tokens.user_id IS 'User ID for direct messages subscription';
