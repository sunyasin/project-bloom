-- Изменение sale_type на массив product_sale_type в таблице products
-- Добавление новой колонки product_sale_type как массива
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_sale_type text[] DEFAULT ARRAY['sell_only']::text[];

-- Копирование существующих значений sale_type в новую колонку
UPDATE products
SET product_sale_type = ARRAY[sale_type]::text[]
WHERE sale_type IS NOT NULL AND product_sale_type IS NULL;

-- Удаление старой колонки sale_type (раскомментировать после проверки)
-- ALTER TABLE products DROP COLUMN IF EXISTS sale_type;

-- Обновление RLS политик если нужно
