-- Таблица категорий товаров
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Package',
    count INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    cities TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: категории публичные для чтения
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
ON public.categories
FOR SELECT
USING (true);

-- Начальные данные
INSERT INTO public.categories (name, icon, count, position, is_hidden, cities) VALUES
('Молочные продукты', 'Milk', 24, 1, false, ARRAY['Коломна', 'Тула', 'Рязань']),
('Фрукты и ягоды', 'Apple', 18, 2, false, ARRAY['Москва', 'Калуга']),
('Зерновые и крупы', 'Wheat', 12, 3, false, ARRAY['Тула', 'Рязань']),
('Мёд и продукты пчеловодства', 'Droplets', 15, 4, false, ARRAY['Коломна', 'Рязань']),
('Яйца и птица', 'Egg', 9, 5, false, ARRAY['Москва', 'Коломна']),
('Хлебобулочные изделия', 'Cookie', 21, 6, false, ARRAY['Тула', 'Калуга']),
('Овощи и зелень', 'Salad', 32, 7, false, ARRAY['Коломна', 'Москва', 'Рязань']),
('Другие товары', 'Package', 25, 8, false, ARRAY['Тула', 'Калуга', 'Рязань']);