-- Add wallet column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN wallet integer NOT NULL DEFAULT 0;