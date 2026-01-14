-- Add gallery_urls column to products table for multiple images
ALTER TABLE public.products 
ADD COLUMN gallery_urls text[] DEFAULT '{}'::text[];