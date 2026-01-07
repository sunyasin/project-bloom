-- Create transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "when" timestamp with time zone NOT NULL DEFAULT now(),
  amount integer NOT NULL
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions where they are sender or receiver
CREATE POLICY "Users can view own transactions"
ON public.transactions
FOR SELECT
USING (
  from_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR to_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Users can insert transactions where they are the sender
CREATE POLICY "Users can create transactions as sender"
ON public.transactions
FOR INSERT
WITH CHECK (
  from_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);