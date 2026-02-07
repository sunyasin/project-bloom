-- Исправление: создаём функции и триггеры с явной схемой public
-- Проблема: функции без схемы могут не быть видны триггерам

-- 1. Удаляем старые функции и триггеры
DROP TRIGGER IF EXISTS log_news_insert ON public.news;
DROP TRIGGER IF EXISTS log_news_update ON public.news;
DROP FUNCTION IF EXISTS public.log_news_change();

-- 2. Создаём функцию с явной схемой public
CREATE OR REPLACE FUNCTION public.log_news_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.content_updates_log (entity_type, entity_id, producer_id, action, new_data)
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

-- 3. Создаём триггер AFTER INSERT
CREATE TRIGGER log_news_insert
  AFTER INSERT ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.log_news_change();

-- 4. Создаём триггер AFTER UPDATE (только при изменении is_published)
CREATE TRIGGER log_news_update
  AFTER UPDATE ON public.news
  FOR EACH ROW
  WHEN (OLD.is_published IS DISTINCT FROM NEW.is_published)
  EXECUTE FUNCTION public.log_news_change();

-- 5. Проверяем что функция создана
SELECT 
  proname AS function_name, 
  nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'log_news_change';

-- 6. Проверяем что триггер создан
SELECT 
  tgname AS trigger_name,
  tablename AS table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE tgname = 'log_news_insert';
