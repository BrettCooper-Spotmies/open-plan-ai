
-- 1. Create tables first
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('dm', 'group')),
  name text,
  description text,
  created_by uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Indexes
CREATE INDEX idx_conversation_members_user ON public.conversation_members(user_id);
CREATE INDEX idx_conversation_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX idx_chat_messages_conv_created ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- 3. Security definer function (tables exist now)
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = _conv_id
      AND user_id = auth.uid()
  )
$$;

-- 4. Trigger: auto-update last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- 5. RLS — conversations
CREATE POLICY "Members can view their conversations"
ON public.conversations FOR SELECT
USING (is_conversation_member(id));

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can update their conversations"
ON public.conversations FOR UPDATE
USING (is_conversation_member(id));

-- 6. RLS — conversation_members
CREATE POLICY "Members can view conversation members"
ON public.conversation_members FOR SELECT
USING (is_conversation_member(conversation_id));

CREATE POLICY "Conversation creators can add members"
ON public.conversation_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR is_conversation_member(conversation_id)
);

CREATE POLICY "Members can remove themselves"
ON public.conversation_members FOR DELETE
USING (user_id = auth.uid() OR is_conversation_member(conversation_id));

-- 7. RLS — chat_messages
CREATE POLICY "Members can view messages"
ON public.chat_messages FOR SELECT
USING (is_conversation_member(conversation_id) AND deleted_at IS NULL);

CREATE POLICY "Members can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (is_conversation_member(conversation_id) AND sender_id = auth.uid());

CREATE POLICY "Senders can update their messages"
ON public.chat_messages FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "Senders can soft-delete their messages"
ON public.chat_messages FOR DELETE
USING (sender_id = auth.uid());

-- 8. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
