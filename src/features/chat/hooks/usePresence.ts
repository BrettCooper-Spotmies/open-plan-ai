import { useEffect } from 'react';
import { chatTransport } from '../transport';
import { useChatStore } from '../stores/useChatStore';

export function usePresence(currentUserId: string | undefined) {
  const setOnlineUserIds = useChatStore((s) => s.setOnlineUserIds);

  useEffect(() => {
    if (!currentUserId) return;

    const transport = chatTransport as any;
    const socket = transport?.socket;
    if (!socket) return;

    const handleOnlineUsers = ({ userIds }: { userIds: string[] }) => {
      setOnlineUserIds(new Set([...userIds, currentUserId]));
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      const current = useChatStore.getState().onlineUserIds;
      setOnlineUserIds(new Set([...current, userId]));
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      const current = useChatStore.getState().onlineUserIds;
      const next = new Set(current);
      next.delete(userId);
      setOnlineUserIds(next);
    };

    socket.on('online-users', handleOnlineUsers);
    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);

    // Mark self as online immediately
    const current = useChatStore.getState().onlineUserIds;
    setOnlineUserIds(new Set([...current, currentUserId]));

    return () => {
      socket.off('online-users', handleOnlineUsers);
      socket.off('user-online', handleUserOnline);
      socket.off('user-offline', handleUserOffline);
    };
  }, [currentUserId, setOnlineUserIds]);
}
