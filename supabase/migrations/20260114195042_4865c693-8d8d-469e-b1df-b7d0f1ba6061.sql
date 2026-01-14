-- First delete existing promotions that would violate the constraint
DELETE FROM public.promotions WHERE true;

-- Drop the category_id column if exists
ALTER TABLE public.promotions DROP COLUMN IF EXISTS category_id;

-- Add business_id column (required, references businesses)
ALTER TABLE public.promotions ADD COLUMN business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_promotions_business ON public.promotions(business_id);