import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 'mention' | 'assignment' | 'completed' | 'comment' | 'deadline';

export interface DbNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  project_id: string | null;
  created_at: string;
  // Joined fields
  actor?: { id: string; name: string; initials: string; avatar_url: string | null } | null;
  project?: { id: string; name: string } | null;
}

export async function fetchNotifications(): Promise<DbNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(id, name, initials, avatar_url),
      project:projects!notifications_project_id_fkey(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as unknown as DbNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true } as never)
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true } as never)
    .eq('user_id', user.id)
    .eq('read', false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function clearReadNotifications(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('read', true);
  if (error) throw error;
}
