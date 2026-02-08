-- Add parent_id column for categories hierarchy

-- Add parent_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add position column if not exists (for ordering within parent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'position'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN position integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create index for faster hierarchical queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_position ON public.categories(position);

-- Update existing categories position if null
UPDATE public.categories SET position = 0 WHERE position IS NULL;
