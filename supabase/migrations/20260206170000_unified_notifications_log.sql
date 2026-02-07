-- Универсальная система уведомлений на Cron
-- Отслеживает: товары, новости, акции производителей

-- 1. Таблица для логирования нового контента
CREATE TABLE IF NOT EXISTS public.content_updates_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'product', 'news', 'promotion'
  entity_id UUID NOT NULL,
  producer_id UUID, -- NULL для контента портала (новости)
  action VARCHAR(20) NOT NULL DEFAULT 'insert', -- 'insert', 'update'
  old_data JSONB,
  new_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Триггеры для автоматического логирования

-- Триггер на products
CREATE OR REPLACE FUNCTION log_product_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO content_updates_log (entity_type, entity_id, producer_id, action, new_data)
  VALUES (
    'product',
    COALESCE(NEW.id, OLD.id),
    NEW.producer_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_product_insert ON public.products;
CREATE TRIGGER log_product_insert
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION log_product_change();

DROP TRIGGER IF EXISTS log_product_update ON public.products;
CREATE TRIGGER log_product_update
  AFTER UPDATE ON public.products
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price)
  EXECUTE FUNCTION log_product_change();

-- Триггер на news (новости портала)
CREATE OR REPLACE FUNCTION log_news_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO content_updates_log (entity_type, entity_id, producer_id, action, new_data)
  VALUES (
    'news',
    COALESCE(NEW.id, OLD.id),
    NULL, -- новости портала
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_news_insert ON public.news;
CREATE TRIGGER log_news_insert
  AFTER INSERT ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION log_news_change();

-- Триггер на promotions
CREATE OR REPLACE FUNCTION log_promotion_change()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO content_updates_log (entity_type, entity_id, producer_id, action, new_data)
  VALUES (
    'promotion',
    COALESCE(NEW.id, OLD.id),
    NEW.owner_id, -- акции привязаны к производителю (owner_id)
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_promotion_insert ON public.promotions;
CREATE TRIGGER log_promotion_insert
  AFTER INSERT ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION log_promotion_change();

-- 3. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_content_updates_unprocessed 
  ON content_updates_log (entity_type, notification_sent) 
  WHERE notification_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_content_updates_created 
  ON content_updates_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_updates_producer 
  ON content_updates_log (producer_id) 
  WHERE producer_id IS NOT NULL;

-- 4. RLS
ALTER TABLE public.content_updates_log ENABLE ROW LEVEL SECURITY;

-- Разрешаем доступ для сервисного ключа (Edge Function)
CREATE POLICY "Service role can manage content_updates_log" ON public.content_updates_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Комментарии
COMMENT ON TABLE content_updates_log IS 'Лог нового контента для Cron уведомлений';
COMMENT ON FUNCTION log_product_change() IS 'Логирует новые товары и изменения цен';
COMMENT ON FUNCTION log_news_change() IS 'Логирует новости портала';
COMMENT ON FUNCTION log_promotion_change() IS 'Логирует акции производителей';
