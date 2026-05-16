import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsService, Notification, NotificationType } from '@/services/notifications.service';
import { formatDistanceToNow } from 'date-fns';

export interface AppNotification extends Omit<Notification, 'type'> {
    type: Notification['type'] | 'message';
    time: string;
    initials?: string;
    project: string;
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

    const notifications: AppNotification[] = rawNotifications.map((n: Notification) => ({
        ...n,
        time: formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }),
        initials: (() => {
            const title: string = n.title || '';
            const words = title.trim().split(/\s+/);
            if (words.length >= 2) {
                return (words[0][0] + words[1][0]).toUpperCase();
            }
            return words[0]?.substring(0, 2).toUpperCase() || '??';
        })(),
        project: n.type === 'message' ? 'Chat' : (n.project?.name || 'Project'),
    }));

    const markAsRead = useMutation({
        mutationFn: (id: string) => notificationsService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: () => notificationsService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
    });

    const deleteNotification = useMutation({
        mutationFn: (id: string) => notificationsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
    });

    const clearRead = useMutation({
        mutationFn: () => notificationsService.deleteAllRead(userId || ''),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
    });

    const createNotification = useMutation({
        mutationFn: (notification: {
            user_id: string;
            actor_id?: string;
            type: NotificationType;
            title: string;
            description: string;
            project_id?: string;
            entity_id?: string;
            entity_type?: string;
        }) => notificationsService.create(notification),
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        clearRead,
        deleteNotification,
        createNotification,
    };
}
