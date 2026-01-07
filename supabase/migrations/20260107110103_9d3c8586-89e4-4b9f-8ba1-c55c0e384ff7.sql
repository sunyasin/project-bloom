-- Create enum for exchange status
CREATE TYPE exchange_status AS ENUM ('created', 'ok_meeting', 'reject', 'pending', 'finished');

-- Create enum for exchange type
CREATE TYPE exchange_type AS ENUM ('goods', 'money');

-- Create exchange table
CREATE TABLE public.exchange (
  id SERIAL PRIMARY KEY,
  creator UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  product_ids UUID[] NOT NULL DEFAULT '{}',
  amount NUMERIC NOT NULL DEFAULT 0,
  status exchange_status NOT NULL DEFAULT 'created',
  comment TEXT,
  type exchange_type NOT NULL DEFAULT 'money'
);