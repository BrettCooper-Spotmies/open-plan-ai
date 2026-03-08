-- 1. Add 'message' to notification_type enum
-- Note: In Postgres, adding values to an enum outside of a transaction is preferred, 
-- but we'll use a DO block for safety.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'notification_type' AND e.enumlabel = 'message') THEN
        ALTER TYPE notification_type ADD VALUE 'message';
    END IF;
END $$;

-- 2. Add conversation_id to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 3. Trigger for Chat Messages
CREATE OR REPLACE FUNCTION public.handle_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient_id UUID;
  v_desc TEXT;
BEGIN
  -- Get sender name
  SELECT name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Truncate message for description
  v_desc := CASE 
    WHEN NEW.content_type = 'text' THEN 
      CASE WHEN length(NEW.content) > 100 THEN left(NEW.content, 97) || '...' ELSE NEW.content END
    ELSE 'Sent an attachment'
  END;

  -- Insert notifications for all members except sender
  -- We use a loop here because one message can notify multiple people
  FOR v_recipient_id IN 
    SELECT user_id FROM public.conversation_members 
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      actor_id,
      type,
      title,
      description,
      conversation_id
    ) VALUES (
      v_recipient_id,
      NEW.sender_id,
      'message',
      'New message from ' || v_sender_name,
      v_desc,
      NEW.conversation_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_chat_message ON public.chat_messages;
CREATE TRIGGER on_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_chat_notification();
