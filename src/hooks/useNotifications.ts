import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsService, Notification } from '@/services/notifications.service';
import { formatDistanceToNow } from 'date-fns';
import { chatTransport } from '@/features/chat/transport';

export interface AppNotification extends Notification {
  read: boolean;
  description: string | null;
  time: string;
  initials: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: rawNotifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationsService.getAll(),
    enabled: !!userId,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-count', userId],
    queryFn: () => notificationsService.getUnreadCount(),
    enabled: !!userId,
  });

  // Real-time: invalidate when a new notification arrives via socket
  useEffect(() => {
    if (!userId) return;
    const socket = (chatTransport as any).socket;
    if (!socket) return;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count', userId] });
    };

    socket.on('notification:created', handler);
    return () => { socket.off('notification:created', handler); };
  }, [userId, queryClient]);

  const notifications: AppNotification[] = rawNotifications.map((n: Notification) => ({
    ...n,
    read: n.readAt !== null,
    description: n.content,
    time: formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }),
    initials: (() => {
      const words = (n.title || '').trim().split(/\s+/);
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return words[0]?.substring(0, 2).toUpperCase() || '??';
    })(),
  }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    queryClient.invalidateQueries({ queryKey: ['notifications-count', userId] });
  };

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: invalidate,
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: invalidate,
  });

  const deleteNotification = useMutation({
    mutationFn: (id: string) => notificationsService.delete(id),
    onSuccess: invalidate,
  });

  const clearReadNotifications = useMutation({
    mutationFn: () => notificationsService.clearRead(),
    onSuccess: invalidate,
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
  };
}
