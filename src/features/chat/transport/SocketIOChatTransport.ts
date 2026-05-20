import { io, Socket } from 'socket.io-client';
import { config } from '@/config';
import { tokenStorage } from '@/services/api/client';
import type { IChatTransport, Unsubscribe } from './IChatTransport';

export class SocketIOChatTransport implements IChatTransport {
  private socket: Socket;
  private activeRooms = new Set<string>();

  constructor() {
    this.socket = io(config.api.wsUrl, {
      // Always read the current token so reconnects use a fresh value
      auth: (cb: (data: object) => void) => {
        cb({ token: tokenStorage.getAccessToken() });
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SocketIOChatTransport] connect error', err.message);
    });

    // Re-join all tracked rooms after every (re)connect
    this.socket.on('connect', () => {
      this.activeRooms.forEach((id) => {
        this.socket.emit('join-conversation', id);
      });
    });
  }

  private joinRoom(conversationId: string) {
    this.activeRooms.add(conversationId);
    this.socket.emit('join-conversation', conversationId);
  }

  private leaveRoom(conversationId: string) {
    this.activeRooms.delete(conversationId);
    this.socket.emit('leave-conversation', conversationId);
  }

  subscribeToMessages(
    conversationId: string,
    onInsert: (message: unknown) => void
  ): Unsubscribe {
    this.joinRoom(conversationId);
    // Filter by conversationId — the socket may be in multiple rooms
    const handler = (msg: unknown) => {
      if ((msg as any)?.conversationId !== conversationId) return;
      onInsert(msg);
    };
    this.socket.on('new-message', handler);
    return () => {
      this.socket.off('new-message', handler);
      this.leaveRoom(conversationId);
    };
  }

  subscribeToMessageUpdates(
    conversationId: string,
    onUpdate: (message: unknown) => void
  ): Unsubscribe {
    this.joinRoom(conversationId);
    const handler = (msg: unknown) => {
      if ((msg as any)?.conversationId !== conversationId) return;
      onUpdate(msg);
    };
    this.socket.on('message-updated', handler);
    return () => {
      this.socket.off('message-updated', handler);
    };
  }

  subscribeToConversationUpdates(
    _conversationIds: string[],
    onUpdate: (payload: unknown) => void
  ): Unsubscribe {
    const handler = (payload: unknown) => onUpdate(payload);
    this.socket.on('conversation-updated', handler);
    return () => {
      this.socket.off('conversation-updated', handler);
    };
  }

  broadcastTyping(conversationId: string, userId: string): void {
    this.socket.emit('typing', { conversationId, userId });
  }

  subscribeToTyping(
    conversationId: string,
    onTyping: (userId: string) => void
  ): Unsubscribe {
    const handler = ({
      userId,
      conversationId: convId,
    }: {
      userId: string;
      conversationId: string;
    }) => {
      if (convId === conversationId) onTyping(userId);
    };
    this.socket.on('user-typing', handler);
    return () => {
      this.socket.off('user-typing', handler);
    };
  }

  subscribeToReadReceipts(
    _conversationId: string,
    onInsert: (payload: unknown) => void
  ): Unsubscribe {
    const handler = (payload: unknown) => onInsert(payload);
    this.socket.on('message-read', handler);
    return () => {
      this.socket.off('message-read', handler);
    };
  }

  subscribeToMemberUpdates(
    _conversationId: string | null,
    onUpdate: (payload: unknown) => void
  ): Unsubscribe {
    const handler = (payload: unknown) => onUpdate(payload);
    this.socket.on('member-updated', handler);
    return () => {
      this.socket.off('member-updated', handler);
    };
  }

  subscribeToReactionUpdates(
    conversationId: string,
    onUpdate: (payload: {
      messageId: string;
      conversationId: string;
      reactions: Array<{ emoji: string; count: number; userIds: string[] }>;
    }) => void
  ): Unsubscribe {
    const handler = (payload: unknown) => {
      const p = payload as { messageId: string; conversationId: string; reactions: Array<{ emoji: string; count: number; userIds: string[] }> };
      if (p?.conversationId !== conversationId) return;
      onUpdate(p);
    };
    this.socket.on('reaction-updated', handler);
    return () => { this.socket.off('reaction-updated', handler); };
  }

  unsubscribe(unsub: Unsubscribe): void {
    unsub();
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}
