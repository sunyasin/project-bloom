-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Businesses are publicly readable"
ON public.businesses
FOR SELECT
USING (true);

-- Insert initial data
INSERT INTO public.businesses (name, category, location, city) VALUES
  ('Пасека Иванова', 'Мёд и продукты пчеловодства', 'Рязанская область', 'Рязань'),
  ('Ферма Петровых', 'Молочные продукты', 'Московская область', 'Коломна'),
  ('Эко-овощи', 'Овощи и зелень', 'Калужская область', 'Калуга'),
  ('Хлебный дом', 'Хлебобулочные изделия', 'Тульская область', 'Тула'),
  ('Молочный край', 'Молочные продукты', 'Тульская область', 'Тула'),
  ('Сады Придонья', 'Фрукты и ягоды', 'Воронежская область', 'Воронеж'),
  ('Сырный дом', 'Молочные продукты', 'Московская область', 'Коломна');