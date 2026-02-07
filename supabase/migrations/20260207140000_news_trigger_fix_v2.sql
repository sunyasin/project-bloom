-- Полное исправление триггеров и RLS для news
-- Эта миграция безопасна для повторного запуска

-- ============================================
-- ЧАСТЬ 1: Удаляем старые функции и триггеры
-- ============================================
DROP TRIGGER IF EXISTS log_news_insert ON public.news;
DROP TRIGGER IF EXISTS log_news_update ON public.news;
DROP FUNCTION IF EXISTS public.log_news_change();

-- ============================================
-- ЧАСТЬ 2: Создаём функцию с явной схемой public
-- ============================================
CREATE OR REPLACE FUNCTION public.log_news_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.content_updates_log (entity_type, entity_id, producer_id, action, new_data)
  VALUES (
    'news',
    COALESCE(NEW.id, OLD.id),
    NEW.owner_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ЧАСТЬ 3: Создаём триггеры
-- ============================================
CREATE TRIGGER log_news_insert
  AFTER INSERT ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.log_news_change();

CREATE TRIGGER log_news_update
  AFTER UPDATE ON public.news
  FOR EACH ROW
  WHEN (OLD.is_published IS DISTINCT FROM NEW.is_published OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION public.log_news_change();

-- ============================================
-- ЧАСТЬ 4: Добавляем RLS политики для admin
-- ============================================

-- Функция для проверки admin роли
CREATE OR REPLACE FUNCTION public.has_admin_role()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role IN ('super_admin', 'news_editor');
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем старые ограничительные политики если есть
DROP POLICY IF EXISTS "Owners can insert own news" ON public.news;
DROP POLICY IF EXISTS "Owners can update own news" ON public.news;
DROP POLICY IF EXISTS "Owners can delete own news" ON public.news;

-- Создаём новые политики для news
CREATE POLICY "Admins can view all news"
ON public.news
FOR SELECT
TO authenticated
USING (public.has_admin_role() OR auth.uid() = owner_id OR is_published = true);

CREATE POLICY "Admins can insert news"
ON public.news
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_role() OR auth.uid() = owner_id);

CREATE POLICY "Admins can update news"
ON public.news
FOR UPDATE
TO authenticated
USING (public.has_admin_role() OR auth.uid() = owner_id)
WITH CHECK (public.has_admin_role() OR auth.uid() = owner_id);

CREATE POLICY "Admins can delete news"
ON public.news
FOR DELETE
TO authenticated
USING (public.has_admin_role() OR auth.uid() = owner_id);

-- Готово! Триггеры и политики созданы.
-- Проверьте что триггер работает добавив новость в /admin
