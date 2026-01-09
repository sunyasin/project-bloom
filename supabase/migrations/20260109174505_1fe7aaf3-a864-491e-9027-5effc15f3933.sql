-- Create enum for message types
CREATE TYPE public.message_type AS ENUM ('admin_status', 'from_admin', 'chat', 'exchange', 'income', 'deleted');

-- Create messages table
CREATE TABLE public.messages (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  from_id UUID NOT NULL,
  to_id UUID NOT NULL,
  message TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'chat'
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or receiver
CREATE POLICY "Users can view own messages"
ON public.messages
FOR SELECT
USING (
  from_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid())
  OR to_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid())
);

-- Users can insert messages as sender
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  from_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid())
);

-- Users can update own sent messages (e.g., mark as deleted)
CREATE POLICY "Users can update own sent messages"
ON public.messages
FOR UPDATE
USING (
  from_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid())
);

-- Add indexes for performance
CREATE INDEX idx_messages_from_id ON public.messages(from_id);
CREATE INDEX idx_messages_to_id ON public.messages(to_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);