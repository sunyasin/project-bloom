-- Add is_read field to messages table
ALTER TABLE public.messages
ADD COLUMN is_read boolean NOT NULL DEFAULT false;

-- Add index for faster unread message queries
CREATE INDEX idx_messages_is_read ON public.messages(is_read);

-- Add index for combined query (unread messages for specific user)
CREATE INDEX idx_messages_to_id_is_read ON public.messages(to_id, is_read) WHERE is_read = false;
