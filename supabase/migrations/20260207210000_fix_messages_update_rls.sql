-- Fix RLS policy for messages update
-- Allow both sender (from_id) and recipient (to_id) to update messages
-- This enables marking received messages as read

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can update own sent messages" ON public.messages;

-- Create new policy: users can update messages they sent OR received
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
USING (
  from_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid())
  OR to_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid())
);
