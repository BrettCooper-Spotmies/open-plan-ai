import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Comment = Database['public']['Tables']['comments']['Row'] & {
    profiles?: {
        id: string;
        name: string;
        initials: string;
        avatar_url: string | null;
        email: string;
    }
};

export const commentsService = {
    async getByEntity(entityId: string, entityType: string) {
        const { data, error } = await supabase
            .from('comments')
            .select('*, profiles:author_id(id, name, initials, avatar_url, email)')
            .eq('entity_id', entityId)
            .eq('entity_type', entityType)
            .is('deleted_at', null)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as Comment[];
    },

    async create(comment: {
        author_id: string;
        content: string;
        entity_id: string;
        entity_type: string;
    }) {
        const { data, error } = await supabase
            .from('comments')
            .insert(comment)
            .select('*, profiles:author_id(id, name, initials, avatar_url, email)')
            .single();

        if (error) throw error;
        return data as Comment;
    },

    async update(commentId: string, content: string) {
        const { data, error } = await supabase
            .from('comments')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('id', commentId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(commentId: string) {
        const { error } = await supabase
            .from('comments')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', commentId);

        if (error) throw error;
    }
};
