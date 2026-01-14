-- Create enum for product sale type
CREATE TYPE public.product_sale_type AS ENUM ('sell_only', 'barter_goods', 'barter_coin');

-- Add sale_type column to products table
ALTER TABLE public.products 
ADD COLUMN sale_type product_sale_type NOT NULL DEFAULT 'sell_only';