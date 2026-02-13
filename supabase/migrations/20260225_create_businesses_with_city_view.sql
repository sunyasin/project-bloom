-- Представление для получения визиток с названием города
-- Используется для чтения данных с названием города
-- Для операций записи используется таблица businesses с city_id
CREATE OR REPLACE VIEW businesses_with_city AS
SELECT 
    b.id,
    b.owner_id,
    b.name,
    b.category,
    b.category_id,
    b.location,
    b.status,
    b.content_json,
    b.created_at,
    b.updated_at,
    b.new_category,
    b.city_id,
    c.name as city_name
FROM businesses b
LEFT JOIN city c ON b.city_id = c.id;

-- Назначаем владельца и права доступа
ALTER VIEW businesses_with_city OWNER TO postgres;
GRANT SELECT ON businesses_with_city TO anon, authenticated;
