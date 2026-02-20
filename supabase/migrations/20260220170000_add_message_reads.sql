-- ============================================================
-- Read Receipts Migration
-- Creates the message_reads table to track when users have
-- read messages in a conversation.
-- ============================================================

-- Track when each user reads each message
CREATE TABLE IF NOT EXISTS message_reads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- Indexes for fast look-ups
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id    ON message_reads(user_id);

-- Enable Row Level Security
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own read records only
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view read records for conversations they belong to
CREATE POLICY "Users can view reads in their conversations"
  ON message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chat_messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reads.message_id
        AND cm.user_id = auth.uid()
    )
  );

-- Enable realtime broadcasts for this table
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
