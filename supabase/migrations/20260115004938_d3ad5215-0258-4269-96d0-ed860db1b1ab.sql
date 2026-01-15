-- Drop old columns from exchange table
ALTER TABLE public.exchange 
DROP COLUMN IF EXISTS product_ids,
DROP COLUMN IF EXISTS amount;

-- Create new exchange_type enum (need to recreate since we're changing values)
-- First, alter the column to text temporarily
ALTER TABLE public.exchange ALTER COLUMN type TYPE text USING type::text;

-- Drop old enum and create new one
DROP TYPE IF EXISTS exchange_type CASCADE;
CREATE TYPE exchange_type AS ENUM ('goods', 'money', 'coins');

-- Convert column back to new enum type with default
ALTER TABLE public.exchange 
ALTER COLUMN type TYPE exchange_type USING type::exchange_type,
ALTER COLUMN type SET DEFAULT 'goods'::exchange_type;

-- Add new jsonb columns
ALTER TABLE public.exchange 
ADD COLUMN buyer_items jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN seller_items jsonb NOT NULL DEFAULT '[]'::jsonb;