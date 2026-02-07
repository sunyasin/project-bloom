-- Fix blob URLs in products table
-- Blob URLs are invalid after browser session ends

-- Check for blob URLs in products table
SELECT id, image_url FROM products WHERE image_url LIKE 'blob:%';

-- Option 1: Set invalid blob URLs to NULL (requires re-upload by user)
UPDATE products SET image_url = NULL WHERE image_url LIKE 'blob:%';

-- Option 2: Or set to default image
-- UPDATE products SET image_url = 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200&h=200&fit=crop' WHERE image_url LIKE 'blob:%';

-- Check for blob URLs in businesses table (if exists)
-- SELECT id, content_json FROM businesses WHERE content_json::text LIKE '%blob:%';

-- Check for blob URLs in promotions table
SELECT id, image_url FROM promotions WHERE image_url LIKE 'blob:%';
UPDATE promotions SET image_url = NULL WHERE image_url LIKE 'blob:%';

-- Check for blob URLs in profiles table
SELECT id, logo_url FROM profiles WHERE logo_url LIKE 'blob:%';
UPDATE profiles SET logo_url = NULL WHERE logo_url LIKE 'blob:%';
