import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { IChatTransport } from './IChatTransport';

export class SupabaseChatTransport implements IChatTransport {
  subscribeToMessages(
    conversationId: string,
    onInsert: (payload: any) => void
  ): RealtimeChannel {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        onInsert
      )
      .subscribe();
  }

  subscribeToMessageUpdates(
    conversationId: string,
    onUpdate: (payload: any) => void
  ): RealtimeChannel {
    return supabase
      .channel(`message-updates:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        onUpdate
      )
      .subscribe();
  }

  subscribeToConversationUpdates(
    conversationIds: string[],
    onUpdate: (payload: any) => void
  ): RealtimeChannel {
    return supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          if (conversationIds.includes((payload.new as any)?.id)) {
            onUpdate(payload);
          }
        }
      )
      .subscribe();
  }

  broadcastTyping(conversationId: string, userId: string): void {
    supabase.channel(`typing:${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    });
  }

  subscribeToTyping(
    conversationId: string,
    onTyping: (userId: string) => void
  ): RealtimeChannel {
    return supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        onTyping(payload.payload.userId);
      })
      .subscribe();
  }

  subscribeToReadReceipts(
    conversationId: string,
    onInsert: (payload: any) => void
  ): RealtimeChannel {
    return supabase
      .channel(`read-receipts:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        onInsert
      )
      .subscribe();
  }

  unsubscribe(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
  }
}
