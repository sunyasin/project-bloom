-- Update all existing messages to is_read = true
-- This marks all previously existing messages as read
UPDATE public.messages
SET is_read = true
WHERE is_read = false;
