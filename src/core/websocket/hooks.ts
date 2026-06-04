import { useEffect, useCallback } from 'react';
import { socketManager } from './socket-manager';

export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;
    return socketManager.on<T>(event, handler);
  }, [event, handler, enabled]);
}

export function useSocketEmit() {
  return useCallback(<T>(event: string, data?: T) => {
    socketManager.emit(event, data);
  }, []);
}

export function useRoom(roomId: string | undefined): void {
  useEffect(() => {
    if (!roomId) return;
    socketManager.joinRoom(roomId);
    return () => socketManager.leaveRoom(roomId);
  }, [roomId]);
}

export function useSocketConnected(): boolean {
  return socketManager.isConnected;
}
