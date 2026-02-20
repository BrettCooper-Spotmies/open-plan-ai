
-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: conversation members can view reactions
CREATE POLICY "Members can view reactions"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages cm
    WHERE cm.id = message_reactions.message_id
      AND public.is_conversation_member(cm.conversation_id)
  )
);

-- INSERT: user_id = auth.uid() AND is conversation member
CREATE POLICY "Members can add reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_messages cm
    WHERE cm.id = message_reactions.message_id
      AND public.is_conversation_member(cm.conversation_id)
  )
);

-- DELETE: user can remove own reactions
CREATE POLICY "Users can remove own reactions"
ON public.message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
