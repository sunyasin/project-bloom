-- Добавляем колонку city_id в таблицу businesses для связи с таблицей городов
ALTER TABLE businesses ADD COLUMN city_id INTEGER REFERENCES city(id) ON DELETE SET NULL;

-- Добавляем колонку city_name для хранения названия города (удобный денормализованный кэш)
ALTER TABLE businesses ADD COLUMN city_name TEXT;

-- Обновляем существующие данные - заполняем city_id и city_name на основе названия города
UPDATE businesses b
SET city_id = c.id, city_name = c.name
FROM city c
WHERE b.city = c.name AND b.city IS NOT NULL AND b.city != '';

-- Удаляем старую колонку city (название города)
ALTER TABLE businesses DROP COLUMN IF EXISTS city;
