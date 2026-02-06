-- Cron функция для обработки уведомлений
-- Запускается каждую минуту

-- Создаём функцию для получения необработанных уведомлений
CREATE OR REPLACE FUNCTION process_notifications_job()
RETURNS TABLE (
  id UUID,
  entity_type VARCHAR,
  entity_id UUID,
  producer_id UUID,
  new_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id,
    cu.entity_type::VARCHAR(50),
    cu.entity_id::UUID,
    cu.producer_id::UUID,
    cu.new_data::JSONB
  FROM content_updates_log cu
  WHERE cu.notification_sent = FALSE
    AND cu.created_at > NOW() - INTERVAL '1 day'
  ORDER BY cu.created_at ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Включаем расширение pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Удаляем старые задания
SELECT cron.unschedule('process-producer-updates');
SELECT cron.unschedule('process-portal-news');

-- Создаём задание для обновлений производителей (товары, акции) - каждую минуту
SELECT cron.schedule(
  'process-producer-updates',
  '* * * * *',
  $$
  UPDATE content_updates_log
  SET processed_at = NOW()
  WHERE notification_sent = FALSE
    AND producer_id IS NOT NULL
    AND entity_type IN ('product', 'promotion')
    AND created_at > NOW() - INTERVAL '1 minute'
    AND processed_at IS NULL
  LIMIT 100;
  $$
);

-- Создаём задание для новостей портала - каждую минуту
SELECT cron.schedule(
  'process-portal-news',
  '* * * * *',
  $$
  UPDATE content_updates_log
  SET processed_at = NOW()
  WHERE notification_sent = FALSE
    AND producer_id IS NULL
    AND entity_type = 'news'
    AND created_at > NOW() - INTERVAL '1 minute'
    AND processed_at IS NULL
  LIMIT 100;
  $$
);

COMMENT ON FUNCTION process_notifications_job() IS 'Возвращает необработанные уведомления для Edge Function';
COMMENT ON EXTENSION pg_cron IS 'Планировщик задач для автоматической обработки уведомлений';
