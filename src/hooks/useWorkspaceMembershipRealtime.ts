import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { chatService, CHAT_ACCESS_INVALIDATE_EVENT } from '@/services/chat.service';
import { useChatStore } from '@/features/chat/stores/useChatStore';

/**
 * When this user is added to or removed from a project, refresh lists that gate on RLS
 * (projects dashboard, dashboard widgets, My Day). Without this, another tab/device can
 * update the DB but React Query may keep a stale list for up to several minutes.
 */
export function useProjectMembershipRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`project-membership-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['myDay'] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}

/**
 * When this user is added to a group conversation (e.g. project chat sync), refresh
 * the conversation list so the sidebar shows the new group without a full reload.
 */
export function useConversationMembershipRealtime() {
  const { user } = useAuth();

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const setConversations = useChatStore.getState().setConversations;

    const channel = supabase
      .channel(`conversation-membership-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const convId = (payload.new as { conversation_id?: string } | null)?.conversation_id;
          if (convId) {
            window.dispatchEvent(
              new CustomEvent(CHAT_ACCESS_INVALIDATE_EVENT, { detail: { conversationId: convId } })
            );
          }
          try {
            const list = await chatService.getConversations();
            setConversations(list);
          } catch (err) {
            console.warn('[useConversationMembershipRealtime] failed to refresh conversations', err);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
