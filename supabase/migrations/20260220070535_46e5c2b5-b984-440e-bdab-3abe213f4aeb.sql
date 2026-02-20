
-- Fix: allow conversation creator to see their own conversation (needed for INSERT ... RETURNING)
DROP POLICY "Members can view their conversations" ON public.conversations;

CREATE POLICY "Members and creators can view their conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
  is_conversation_member(id)
  OR created_by = auth.uid()
);
