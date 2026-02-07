-- Добавление поля producer_id для новостей производителя
-- Новости портала: producer_id = NULL
-- Новости производителя: producer_id = user.id

-- Добавляем поле producer_id (nullable)
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS producer_id UUID;

-- Обновляем RLS политики для producer_id
-- Обновляем функцию триггера для логирования
CREATE OR REPLACE FUNCTION log_news_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO content_updates_log (entity_type, entity_id, producer_id, action, new_data)
  VALUES (
    'news',
    COALESCE(NEW.id, OLD.id),
    NEW.producer_id, -- NULL для новостей портала, != NULL для новостей производителя
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Пересоздаем триггер
DROP TRIGGER IF EXISTS log_news_insert ON public.news;
CREATE TRIGGER log_news_insert
  AFTER INSERT ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION log_news_change();

COMMENT ON FUNCTION log_news_change() IS 'Логирует новости (producer_id=NULL для портала, !=NULL для производителя)';
