-- Add business_card_id column to products table for linking products to business cards
-- If business_card_id is NULL, product will be shown on ALL business cards of the producer

-- Add the column
ALTER TABLE public.products
ADD COLUMN business_card_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

-- Create index for faster filtering on business card pages
-- This index is partial - only indexes rows where business_card_id is not null
CREATE INDEX idx_products_business_card ON public.products(business_card_id) WHERE business_card_id IS NOT NULL;

-- Add comment to explain the logic
COMMENT ON COLUMN public.products.business_card_id IS 'Link to business card. If NULL, product is shown on all business cards of the producer';
