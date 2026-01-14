-- Add category_id to promotions table
ALTER TABLE public.promotions 
ADD COLUMN category_id uuid REFERENCES public.categories(id);

-- Remove business_id column from promotions
ALTER TABLE public.promotions 
DROP COLUMN IF EXISTS business_id;

-- Create index for category filtering
CREATE INDEX idx_promotions_category ON public.promotions(category_id);