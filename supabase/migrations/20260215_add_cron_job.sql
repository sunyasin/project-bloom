-- CRON job для автоматической проверки новых сообщений и отправки Telegram уведомлений
-- ВНИМАНИЕ: pg_cron требует Supabase Pro план или выше
-- Для бесплатного плана используйте внешний cron сервис (cron-job.org)

-- Включить расширение pg_cron (если ещё не включено)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Удалить существующее задание если есть
SELECT cron.unschedule('process-notifications-cron');

-- ============================================================
-- ВАЖНО: Перед использованием добавьте SUPAPI_SECRET_KEY
-- В Supabase Dashboard: Project Settings → API → Secret Keys
-- Добавьте переменную: SUPAPI_SECRET_KEY = ваш_секретный_ключ
-- ============================================================

-- Для Pro плана: создать cron задание каждые 5 минут
-- Замените 'SUPAPI_SECRET_KEY' на значение из Supabase Dashboard

SELECT cron.schedule(
  'process-notifications-cron',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://bcoraetbfyxxpifavfpd.functions.supabase.co/functions/v1/process-notifications?type=all',
      headers := '{"Content-Type": "application/json", "x-api-key": "SUPAPI_SECRET_KEY"}'::jsonb
    );
  $$
);

-- Для бесплатного плана: используйте внешний cron сервис
-- Зарегистрируйтесь на https://cron-job.org
-- Добавьте URL: https://bcoraetbfyxxpifavfpd.functions.supabase.co/functions/v1/process-notifications?type=messages
-- Период: каждые 5 минут
-- Добавьте заголовок: x-api-key: SUPAPI_SECRET_KEY

-- Проверка текущих заданий cron
-- SELECT * FROM cron.job;
