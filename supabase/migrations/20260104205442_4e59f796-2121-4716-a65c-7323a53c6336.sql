-- Create news table
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  is_event BOOLEAN NOT NULL DEFAULT false,
  event_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own news
CREATE POLICY "Owners can view own news"
ON public.news
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own news"
ON public.news
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own news"
ON public.news
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own news"
ON public.news
FOR DELETE
USING (auth.uid() = owner_id);

-- Published news are publicly readable
CREATE POLICY "Published news are publicly readable"
ON public.news
FOR SELECT
USING (is_published = true);

-- Trigger for updated_at
CREATE TRIGGER update_news_updated_at
BEFORE UPDATE ON public.news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();