-- Delete all existing transactions
DELETE FROM public.transactions;

-- Add hash column to transactions table
ALTER TABLE public.transactions
ADD COLUMN hash text NOT NULL;