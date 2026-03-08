import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsService, Notification, NotificationType } from '@/services/notifications.service';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { formatDistanceToNow } from 'date-fns';

export interface AppNotification extends Omit<Notification, 'type'> {
    type: Notification['type'] | 'message';
    time: string;
    initials?: string;
    project: string;
    conversation_id?: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.id;

    const { data: rawNotifications = [], isLoading, error } = useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => userId ? notificationsService.getAllByUserId(userId) : Promise.resolve([]),
        enabled: !!userId,
    });

    const notifications: AppNotification[] = rawNotifications.map(n => ({
        ...n,
        time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
        initials: n.actor?.full_name
            ? n.actor.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : n.actor?.email?.substring(0, 2).toUpperCase(),
        project: n.type === 'message' ? 'Chat' : (n.projects?.name || 'Project'),
    }));

    // Set up realtime subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`user-notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;

                    // Show toast for new notification
                    toast.info(newNotification.title, {
                        description: newNotification.description,
                    });

                    // Update cache - append to the beginning
                    queryClient.setQueryData(['notifications', userId], (old: Notification[] = []) => {
                        // Check if already exists to avoid duplicates
                        if (old.some(n => n.id === newNotification.id)) return old;
                        return [newNotification, ...old];
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to notifications');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    const markAsRead = useMutation({
        mutationFn: (id: string) => notificationsService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: () => userId ? notificationsService.markAllAsRead(userId) : Promise.reject('No user ID'),
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
        mutationFn: () => userId ? notificationsService.deleteAllRead(userId) : Promise.reject('No user ID'),
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
