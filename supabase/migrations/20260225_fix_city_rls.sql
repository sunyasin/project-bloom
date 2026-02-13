-- Исправляем RLS для таблицы city
-- Удаляем старые политики и создаём новые

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Public read access to cities" ON city;
DROP POLICY IF EXISTS "Authenticated users can insert cities" ON city;
DROP POLICY IF EXISTS "Authenticated users can update cities" ON city;

-- Создаём новую политику для публичного чтения
CREATE POLICY "city_public_read" ON city
    FOR SELECT USING (true);

-- Проверяем, что анонимный пользователь имеет доступ
GRANT SELECT ON city TO anon, authenticated;
