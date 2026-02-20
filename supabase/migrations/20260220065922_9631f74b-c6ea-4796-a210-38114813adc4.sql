
DROP POLICY IF EXISTS "Conversation creators can add members" ON public.conversation_members;

CREATE POLICY "Conversation creators and members can add members"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR is_conversation_member(conversation_id)
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id
      AND created_by = auth.uid()
  )
);
