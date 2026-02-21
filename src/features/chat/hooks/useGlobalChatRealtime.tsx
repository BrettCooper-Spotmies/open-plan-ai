import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '../stores/useChatStore';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Global hook to listen for new chat messages continuously in the background
 * regardless of what page the user is on.
 * 
 * - Shows a toast notification if the user receives a message and they aren't looking at that chat.
 * - Updates the global unread counts in the chat store.
 */
export function useGlobalChatRealtime() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const channelRef = useRef<any>(null);

  // We use refs for state that we need inside the subscription callback
  // to avoid re-subscribing on every state change.
  const activeConversationIdRef = useRef(useChatStore.getState().activeConversationId);
  
  // Keep the ref in sync with the actual store state
  useEffect(() => {
    return useChatStore.subscribe((state) => {
      activeConversationIdRef.current = state.activeConversationId;
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // We only want to listen for INSERTs on chat_messages where the sender is NOT the current user
    const channel = supabase
      .channel('global-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Don't notify for our own messages
          if (newMsg.sender_id === user.id) return;

          // Check if we are currently looking at this conversation
          const isChattingInThisConv = 
            location.pathname.startsWith('/chat') && 
            activeConversationIdRef.current === newMsg.conversation_id;

          if (!isChattingInThisConv) {
            // 1. Increment the unread count globally so the sidebar/header badges update
            useChatStore.getState().incrementUnread(newMsg.conversation_id);

            // 2. Fetch sender name, avatar, and conversation name for the toast
            try {
              const [{ data: sender }, { data: conv }] = await Promise.all([
                supabase
                  .from('profiles')
                  .select('name, avatar_url, initials')
                  .eq('id', newMsg.sender_id)
                  .single(),
                supabase
                  .from('conversations')
                  .select('name, type')
                  .eq('id', newMsg.conversation_id)
                  .single()
              ]);

              const senderName = sender?.name || 'Someone';
              
              // Determine toast title
              let title = `New message from ${senderName}`;
              if (conv?.type === 'group' && conv.name) {
                title = `New message in ${conv.name}`;
              }

              // 3. Show a toast notification
              const rawDesc = newMsg.content_type === 'text' ? newMsg.content : 'Sent an attachment';
              const description = rawDesc.length > 100 ? rawDesc.substring(0, 100) + '...' : rawDesc;

              toast.custom((t) => (
                <div className="w-[356px] rounded-lg border border-border bg-background p-4 shadow-lg pointer-events-auto">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      {sender?.avatar_url && <AvatarImage src={sender.avatar_url} />}
                      <AvatarFallback>{sender?.initials || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-sm text-muted-foreground mt-1 break-words line-clamp-2">{description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button 
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 h-8 px-3 transition-colors"
                      onClick={() => toast.dismiss(t)}
                    >
                      Close
                    </button>
                    <button 
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 transition-colors"
                      onClick={() => {
                        toast.dismiss(t);
                        navigate(`/chat/${newMsg.conversation_id}`);
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ), { duration: 5000 });

              // 4. Invalidate the conversations cache so the next time they visit the chat page, 
              // the conversation list shows the new last message and sorts correctly
              useChatStore.setState({ conversationsLoadedAt: null });
            } catch (err) {
              console.error('Failed to parse notification info', err);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, location.pathname, navigate]);
}
