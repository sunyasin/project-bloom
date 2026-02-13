-- Add new_category field to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS new_category TEXT;
