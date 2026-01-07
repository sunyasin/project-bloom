-- Create coins table
CREATE TABLE public.coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_text text NOT NULL,
  "when" timestamp with time zone NOT NULL DEFAULT now(),
  amount integer NOT NULL,
  who uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_balance integer NOT NULL,
  total_balance integer NOT NULL,
  hash text NOT NULL
);

-- Enable RLS
ALTER TABLE public.coins ENABLE ROW LEVEL SECURITY;

-- Users can view their own coins records
CREATE POLICY "Users can view own coins"
ON public.coins
FOR SELECT
USING (
  who IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Users can insert their own coins records
CREATE POLICY "Users can insert own coins"
ON public.coins
FOR INSERT
WITH CHECK (
  who IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);