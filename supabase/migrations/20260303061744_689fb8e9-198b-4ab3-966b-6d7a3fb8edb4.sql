
-- Tighten INSERT policy: only allow inserting notifications where actor_id matches the current user
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);
