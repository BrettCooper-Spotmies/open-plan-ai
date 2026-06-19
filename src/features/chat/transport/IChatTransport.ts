export type Unsubscribe = () => void;

export interface IChatTransport {
  subscribeToMessages(
    conversationId: string,
    onInsert: (message: unknown) => void
  ): Unsubscribe;

  subscribeToMessageUpdates(
    conversationId: string,
    onUpdate: (message: unknown) => void
  ): Unsubscribe;

  subscribeToConversationUpdates(
    conversationIds: string[],
    onUpdate: (payload: unknown) => void
  ): Unsubscribe;

  broadcastTyping(conversationId: string, userId: string): void;

  subscribeToTyping(
    conversationId: string,
    onTyping: (userId: string) => void
  ): Unsubscribe;

  subscribeToReadReceipts(
    conversationId: string,
    onInsert: (payload: unknown) => void
  ): Unsubscribe;

  subscribeToMemberUpdates(
    conversationId: string | null,
    onUpdate: (payload: unknown) => void
  ): Unsubscribe;

  subscribeToReactionUpdates(
    conversationId: string,
    onUpdate: (payload: {
      messageId: string;
      conversationId: string;
      reactions: Array<{ emoji: string; count: number; userIds: string[] }>;
    }) => void
  ): Unsubscribe;

  unsubscribe(channel: Unsubscribe): void;

  disconnect(): void;
}
