import { io, Socket } from 'socket.io-client';
import { appConfig } from '@/core/config';
import { tokenStorage } from '@/core/api/interceptors';
import { logger } from '@/core/logger';
import { WS_EVENTS } from './events';

type EventCallback<T = unknown> = (data: T) => void;

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly listeners = new Map<string, Set<EventCallback>>();

  connect(): void {
    if (this.socket?.connected) return;

    const token = tokenStorage.getAccessToken();
    if (!token) {
      logger.warn('[WS] No access token — skipping connection');
      return;
    }

    this.socket = io(appConfig.api.wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    this.socket.on(WS_EVENTS.CONNECT, () => {
      this.reconnectAttempts = 0;
      logger.info('[WS] Connected', { id: this.socket?.id });
    });

    this.socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      logger.warn('[WS] Disconnected', { reason });
    });

    this.socket.on(WS_EVENTS.CONNECT_ERROR, (err) => {
      this.reconnectAttempts++;
      logger.error('[WS] Connection error', { err: err.message, attempt: this.reconnectAttempts });
    });

    this.reattachListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit<T>(event: string, data?: T): void {
    if (!this.socket?.connected) {
      logger.warn(`[WS] Cannot emit "${event}" — not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    this.socket?.on(event, callback as EventCallback);

    return () => this.off(event, callback);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback as EventCallback);
    this.socket?.off(event, callback as EventCallback);
  }

  joinRoom(roomId: string): void {
    this.emit(WS_EVENTS.JOIN_ROOM, { roomId });
  }

  leaveRoom(roomId: string): void {
    this.emit(WS_EVENTS.LEAVE_ROOM, { roomId });
  }

  updateAuth(): void {
    const token = tokenStorage.getAccessToken();
    if (this.socket && token) {
      this.socket.auth = { token };
      this.socket.disconnect().connect();
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private reattachListeners(): void {
    if (!this.socket) return;
    for (const [event, callbacks] of this.listeners.entries()) {
      for (const cb of callbacks) {
        this.socket.on(event, cb);
      }
    }
  }
}

export const socketManager = new SocketManager();
