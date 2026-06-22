import { io, Socket } from 'socket.io-client';
import { config } from '@/config';
import type { IChatTransport, Unsubscribe } from './IChatTransport';
import { logger } from '@/services/monitoring/logger';

export class SocketIOChatTransport implements IChatTransport {
  private socket: Socket;
  private activeRooms = new Set<string>();
  private roomRefCounts = new Map<string, number>();

  constructor() {
    this.socket = io(config.api.wsUrl, {
      // Auth is via the httpOnly accessToken cookie — withCredentials makes the
      // browser send it on the WS handshake, where the server reads it.
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect_error', (err) => {
      logger.warn('[SocketIOChatTransport] connect error', err.message);
    });

    // Re-join all tracked rooms after every (re)connect
    this.socket.on('connect', () => {
      this.activeRooms.forEach((id) => {
        this.socket.emit('join-conversation', id);
      });
    });
  }

  private joinRoom(conversationId: string) {
    const count = (this.roomRefCounts.get(conversationId) || 0) + 1;
    this.roomRefCounts.set(conversationId, count);
    this.activeRooms.add(conversationId);
    if (count === 1) {
      this.socket.emit('join-conversation', conversationId);
    }
  }

  private leaveRoom(conversationId: string) {
    const count = Math.max(0, (this.roomRefCounts.get(conversationId) || 0) - 1);
    this.roomRefCounts.set(conversationId, count);
    if (count === 0) {
      this.activeRooms.delete(conversationId);
      this.socket.emit('leave-conversation', conversationId);
    }
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
    conversationId: string,
    onInsert: (payload: unknown) => void
  ): Unsubscribe {
    const handler = (payload: unknown) => {
      if ((payload as any)?.conversationId !== conversationId) return;
      onInsert(payload);
    };
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
