
-- Fix content_type constraint to allow 'file'
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_content_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_content_type_check 
  CHECK (content_type = ANY (ARRAY['text', 'system', 'file']));

-- Add deleted_by_name column for soft-delete attribution
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;

-- Update SELECT RLS policy to show soft-deleted messages (so "deleted by X" text appears)
DROP POLICY IF EXISTS "Members can view messages" ON chat_messages;
CREATE POLICY "Members can view messages" ON chat_messages
  FOR SELECT USING (is_conversation_member(conversation_id));

