-- Drop and recreate exchange_type enum with new values
-- First, update the column to use text temporarily
ALTER TABLE public.exchange ALTER COLUMN type DROP DEFAULT;
ALTER TABLE public.exchange ALTER COLUMN type TYPE text USING type::text;

-- Drop the old enum
DROP TYPE IF EXISTS public.exchange_type;

-- Create new enum with updated values
CREATE TYPE public.exchange_type AS ENUM ('goods-goods', 'goods-rub', 'goods-coin');

-- Convert the column back to the new enum type
ALTER TABLE public.exchange ALTER COLUMN type TYPE public.exchange_type USING 
  CASE 
    WHEN type = 'goods' THEN 'goods-goods'::public.exchange_type
    WHEN type = 'money' THEN 'goods-rub'::public.exchange_type
    ELSE 'goods-goods'::public.exchange_type
  END;

-- Set default value
ALTER TABLE public.exchange ALTER COLUMN type SET DEFAULT 'goods-goods'::public.exchange_type;