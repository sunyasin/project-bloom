-- Исправление RLS политик для news и проверка триггеров
-- Проблема: RLS требует auth.uid() = owner_id, что блокирует admin пользователей

-- 1. Создаём функцию для проверки роли пользователя
CREATE OR REPLACE FUNCTION public.has_admin_role()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Проверяем есть ли у пользователя роль super_admin или news_editor
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role IN ('super_admin', 'news_editor');
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Добавляем RLS политику для admin (INSERT/UPDATE/DELETE)
-- Админы могут управлять любыми новостями
CREATE POLICY "Admins can manage all news"
ON public.news
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'news_editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'news_editor')
  )
);

-- 3. Проверяем и создаём триггер log_news_insert если его нет
-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS log_news_insert ON public.news;

-- Создаём триггер заново
CREATE TRIGGER log_news_insert
  AFTER INSERT ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.log_news_change();

-- 4. Добавляем триггер на UPDATE если его нет
DROP TRIGGER IF EXISTS log_news_update ON public.news;
CREATE TRIGGER log_news_update
  AFTER UPDATE ON public.news
  FOR EACH ROW
  WHEN (OLD.is_published IS DISTINCT FROM NEW.is_published)
  EXECUTE FUNCTION public.log_news_change();

-- 5. Удаляем старые ограничительные политики для INSERT/UPDATE/DELETE
-- (они конфликтуют с новыми admin политиками)
DROP POLICY IF EXISTS "Owners can insert own news" ON public.news;
DROP POLICY IF EXISTS "Owners can update own news" ON public.news;
DROP POLICY IF EXISTS "Owners can delete own news" ON public.news;

-- 6. Комментарии
COMMENT ON FUNCTION public.has_admin_role() IS 'Проверяет имеет ли пользователь роль admin (super_admin или news_editor)';
COMMENT ON POLICY "Admins can manage all news" ON public.news IS 'Позволяет admin пользователям управлять всеми новостями';
