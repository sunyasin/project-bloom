-- Create storage bucket for category images

-- Insert bucket using SQL (Supabase storage stores buckets in storage.buckets table)
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for authenticated users to upload category images
CREATE POLICY "Authenticated users can upload category images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'category-images'
  );

-- Allow public read access to category images
CREATE POLICY "Public can view category images"
  ON storage.objects
  FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'category-images');
