import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationType = Database['public']['Enums']['notification_type'];

export const notificationsService = {
    async getAllByUserId(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*, projects(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any[];
    },

    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
    },

    async delete(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
    },

    async deleteAllRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', userId)
            .eq('read', true);

        if (error) throw error;
    },

    async create(notification: {
        user_id: string;
        actor_id?: string;
        type: NotificationType;
        title: string;
        description: string; // Changed from content to description to match DB schema
        project_id?: string;
        conversation_id?: string;
        entity_id?: string;
        entity_type?: string;
    }) {
        // Keep backward compatibility with callers that still pass legacy fields
        // but only insert columns that exist on the notifications table.
        const payload = {
            user_id: notification.user_id,
            actor_id: notification.actor_id ?? null,
            type: notification.type,
            title: notification.title,
            description: notification.description,
            project_id: notification.project_id ?? null,
            conversation_id: notification.conversation_id ?? null,
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
