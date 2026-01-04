-- Create promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount TEXT NOT NULL,
  image_url TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own promotions
CREATE POLICY "Owners can view own promotions"
ON public.promotions
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own promotions"
ON public.promotions
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own promotions"
ON public.promotions
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own promotions"
ON public.promotions
FOR DELETE
USING (auth.uid() = owner_id);

-- Active promotions are publicly readable
CREATE POLICY "Active promotions are publicly readable"
ON public.promotions
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();