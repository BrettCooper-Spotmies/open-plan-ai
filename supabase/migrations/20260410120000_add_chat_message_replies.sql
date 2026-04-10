ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS reply_to_message_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_reply_to_message_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_message_id_fkey
    FOREIGN KEY (reply_to_message_id)
    REFERENCES public.chat_messages(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_message_id
ON public.chat_messages(reply_to_message_id);
