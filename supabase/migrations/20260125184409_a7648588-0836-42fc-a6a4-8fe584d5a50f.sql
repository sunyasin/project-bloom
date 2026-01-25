-- Add coin_price column for digital barter products
ALTER TABLE public.products
ADD COLUMN coin_price integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.products.coin_price IS 'Price in coins for digital barter (barter_coin sale type)';