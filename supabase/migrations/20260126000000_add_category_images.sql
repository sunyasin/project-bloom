-- Add image_url column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update categories with Supabase Storage URLs
-- After uploading images to category-images bucket, update with:
-- https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/[filename]

UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/vypechka.jpg' WHERE name = 'Выпечка';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/kolbasy.jpg' WHERE name = 'Колбасы';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/konservy.jpg' WHERE name = 'Консервы';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/krupy.jpg' WHERE name = 'Зерновые и крупы';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/molochnye.jpg' WHERE name = 'Молочные продукты';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/med.jpg' WHERE name = 'Мёд и продукты пчеловодства';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/myaso.jpg' WHERE name = 'Мясо';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/ovoshi.jpg' WHERE name = 'Овощи и зелень';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/ptitsa.jpg' WHERE name = 'Птица';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/ryba.jpg' WHERE name = 'Рыба';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/syry.jpg' WHERE name = 'Сыры';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/frukty.jpg' WHERE name = 'Фрукты и ягоды';
UPDATE categories SET image_url = 'https://gchrpuqivmsdeiavhifi.supabase.co/storage/v1/object/public/category-images/yaytsa.jpg' WHERE name = 'Яйца';
