-- Создаём enum для статусов визитки
CREATE TYPE public.business_status AS ENUM ('draft', 'moderation', 'published', 'deleted');

-- Добавляем новые колонки в таблицу businesses
ALTER TABLE public.businesses
ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN content_json JSONB DEFAULT '{}',
ADD COLUMN status public.business_status DEFAULT 'draft',
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN donation_30d NUMERIC(10, 2) DEFAULT 0;

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Удаляем старую restrictive policy
DROP POLICY IF EXISTS "Businesses are publicly readable" ON public.businesses;

-- RLS политики для businesses

-- Все могут читать опубликованные визитки
CREATE POLICY "Published businesses are publicly readable"
ON public.businesses
FOR SELECT
USING (status = 'published');

-- Владелец может читать все свои визитки
CREATE POLICY "Owners can view own businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Владелец может создавать свои визитки
CREATE POLICY "Owners can insert own businesses"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Владелец может обновлять свои визитки
CREATE POLICY "Owners can update own businesses"
ON public.businesses
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Владелец может удалять свои визитки (soft delete через status)
CREATE POLICY "Owners can delete own businesses"
ON public.businesses
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);