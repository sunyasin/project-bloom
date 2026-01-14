-- Add reply_to field for message threading
ALTER TABLE public.messages 
ADD COLUMN reply_to integer REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add index for faster thread queries
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to);

-- Update message_type enum to include new types
ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'from_admin';
ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'income';