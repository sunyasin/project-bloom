-- Исправление: producer_id должен быть NULL для новостей портала

-- Удаляем старую функцию и триггер
DROP TRIGGER IF EXISTS log_news_insert ON public.news;
DROP TRIGGER IF EXISTS log_news_update ON public.news;
DROP FUNCTION IF EXISTS public.log_news_change();

-- Создаём функцию заново с NULL для producer_id
CREATE OR REPLACE FUNCTION public.log_news_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.content_updates_log (entity_type, entity_id, producer_id, action, new_data)
  VALUES (
    'news',
    COALESCE(NEW.id, OLD.id),
    NULL, -- Новости портала, producer_id = NULL
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаём триггеры
CREATE TRIGGER log_news_insert
  AFTER INSERT ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.log_news_change();

CREATE TRIGGER log_news_update
  AFTER UPDATE ON public.news
  FOR EACH ROW
  WHEN (OLD.is_published IS DISTINCT FROM NEW.is_published OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION public.log_news_change();
