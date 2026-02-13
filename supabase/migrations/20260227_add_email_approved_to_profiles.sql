-- Add email_approved flag to profiles table (without NOT NULL first)
ALTER TABLE profiles ADD COLUMN email_approved BOOLEAN DEFAULT false;

-- Set existing users to true (they've already confirmed their email)
UPDATE profiles SET email_approved = true WHERE email_approved IS NULL OR email_approved = false;

-- Add NOT NULL constraint
ALTER TABLE profiles ALTER COLUMN email_approved SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_approved ON profiles(email_approved);
