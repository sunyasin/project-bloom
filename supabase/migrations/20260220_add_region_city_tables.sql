-- Create region table with SERIAL
CREATE TABLE IF NOT EXISTS region (
    id SERIAL PRIMARY KEY,
    country TEXT NOT NULL DEFAULT 'РФ',
    republic TEXT,
    oblast TEXT,
    district TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for region
ALTER TABLE region ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to regions
CREATE POLICY "Public read access to regions" ON region
    FOR SELECT USING (true);

-- Create policy for authenticated users to insert regions (admin only in practice)
CREATE POLICY "Authenticated users can insert regions" ON region
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update regions (admin only in practice)
CREATE POLICY "Authenticated users can update regions" ON region
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create city table with type enum and region reference
CREATE TYPE city_type AS ENUM ('село', 'поселок', 'деревня', 'город');

CREATE TABLE IF NOT EXISTS city (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type city_type NOT NULL DEFAULT 'село',
    region_id INTEGER REFERENCES region(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for city
ALTER TABLE city ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to cities
CREATE POLICY "Public read access to cities" ON city
    FOR SELECT USING (true);

-- Create policy for authenticated users to insert cities (admin only in practice)
CREATE POLICY "Authenticated users can insert cities" ON city
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update cities (admin only in practice)
CREATE POLICY "Authenticated users can update cities" ON city
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default region: РФ, Крым, Бахчисарайский район
INSERT INTO region (country, republic, oblast, district)
VALUES ('РФ', 'Крым', NULL, 'Бахчисарайский район')
ON CONFLICT DO NOTHING
RETURNING id;

-- Insert villages for Бахчисарайский район
INSERT INTO city (name, type, region_id) VALUES
    ('Соколиное', 'село', 1),
    ('Аромат', 'село', 1),
    ('Куйбышево', 'поселок', 1),
    ('Танковое', 'село', 1),
    ('Голубинка', 'село', 1),
    ('Нижняя Голубинка', 'село', 1),
    ('Поляна', 'село', 1),
    ('Солнечноселье', 'село', 1),
    ('Счастливое', 'село', 1),
    ('Новоульяновка', 'село', 1)
ON CONFLICT DO NOTHING;

-- Add region_id column to profiles table (optional - for future use)
--ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES region(id) ON DELETE SET NULL;

-- Replace city TEXT column with city_id INTEGER FK
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES city(id) ON DELETE SET NULL;

-- Copy existing city names to city_id
DO $$
DECLARE
    city_record RECORD;
BEGIN
    FOR city_record IN 
        SELECT id, name FROM city
    LOOP
        UPDATE profiles 
        SET city_id = city_record.id 
        WHERE profiles.city = city_record.name;
    END LOOP;
END $$;

-- Drop old city TEXT column (optional - can be kept for backup)
ALTER TABLE profiles DROP COLUMN IF EXISTS city;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_city_region_id ON city(region_id);
CREATE INDEX IF NOT EXISTS idx_city_type ON city(type);
CREATE INDEX IF NOT EXISTS idx_region_district ON region(district);
CREATE INDEX IF NOT EXISTS idx_profiles_city_id ON profiles(city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_region_id ON profiles(region_id);
