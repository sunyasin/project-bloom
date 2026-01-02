-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  unit TEXT DEFAULT 'шт',
  image_url TEXT,
  category_id UUID,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Published products are publicly readable (for is_available = true)
CREATE POLICY "Available products are publicly readable"
ON public.products
FOR SELECT
USING (is_available = true);

-- Policy: Owners can view their own products
CREATE POLICY "Owners can view own products"
ON public.products
FOR SELECT
TO authenticated
USING (auth.uid() = producer_id);

-- Policy: Owners can insert their own products
CREATE POLICY "Owners can insert own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = producer_id);

-- Policy: Owners can update their own products
CREATE POLICY "Owners can update own products"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = producer_id)
WITH CHECK (auth.uid() = producer_id);

-- Policy: Owners can delete their own products
CREATE POLICY "Owners can delete own products"
ON public.products
FOR DELETE
TO authenticated
USING (auth.uid() = producer_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();