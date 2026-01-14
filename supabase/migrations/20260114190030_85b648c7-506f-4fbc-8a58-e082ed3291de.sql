-- Add donation field to promotions table for sorting by donation amount
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS donation numeric NOT NULL DEFAULT 0;

-- Add index for efficient sorting by donation
CREATE INDEX IF NOT EXISTS idx_promotions_donation ON public.promotions (donation DESC);