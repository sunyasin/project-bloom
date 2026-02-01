-- Add 'coin_request' to message_type enum
ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'coin_request';

-- Create storage bucket for coin request images
INSERT INTO storage.buckets (id, name, public)
VALUES ('coin-requests', 'coin-requests', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for coin-requests bucket
CREATE POLICY "Users can upload coin request images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'coin-requests' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coin request images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'coin-requests');

CREATE POLICY "Users can update own coin request images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'coin-requests' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own coin request images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'coin-requests' AND auth.uid()::text = (storage.foldername(name))[1]);