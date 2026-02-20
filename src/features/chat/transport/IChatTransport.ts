import type { RealtimeChannel } from '@supabase/supabase-js';

export interface IChatTransport {
  subscribeToMessages(
    conversationId: string,
    onInsert: (payload: any) => void
  ): RealtimeChannel;

  subscribeToConversationUpdates(
    conversationIds: string[],
    onUpdate: (payload: any) => void
  ): RealtimeChannel;

  broadcastTyping(conversationId: string, userId: string): void;

  subscribeToTyping(
    conversationId: string,
    onTyping: (userId: string) => void
  ): RealtimeChannel;

  unsubscribe(channel: RealtimeChannel): void;
}
