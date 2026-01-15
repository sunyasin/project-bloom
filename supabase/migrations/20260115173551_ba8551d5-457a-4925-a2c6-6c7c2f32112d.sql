-- Add sum column for coin exchanges
ALTER TABLE public.exchange ADD COLUMN IF NOT EXISTS sum integer DEFAULT 0;