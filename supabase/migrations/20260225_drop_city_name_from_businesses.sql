-- Удаляем колонку city_name из businesses
-- Теперь используется только city_id для связи с таблицей city
-- Для получения названия города используется представление businesses_with_city
ALTER TABLE businesses DROP COLUMN IF EXISTS city_name;
