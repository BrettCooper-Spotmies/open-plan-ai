import { supabase } from '@/integrations/supabase/client';
import { mapConversation, mapMember, mapMessage } from '@/features/chat/chat.mappers';
import type { Conversation, ChatMessage, ReachableUser } from '@/features/chat/types';

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const userId = await getCurrentUserId();

    // 1. Get conversation IDs for this user
    const { data: memberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);
    if (memErr) throw memErr;
    if (!memberships?.length) return [];

    const convIds = memberships.map((m: any) => m.conversation_id);

    // 2. Get conversations
    const { data: conversations, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });
    if (convErr) throw convErr;

    // 3. Get all members for these conversations
    const { data: allMembers, error: allMemErr } = await supabase
      .from('conversation_members')
      .select('*')
      .in('conversation_id', convIds);
    if (allMemErr) throw allMemErr;

    // 4. Get profiles for all member user IDs
    const memberUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials, role')
      .in('id', memberUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // 5. Get last message for each conversation
    const lastMessages: Record<string, any> = {};
    for (const convId of convIds) {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('content, sender_id, created_at')
        .eq('conversation_id', convId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      if (msgs?.[0]) {
        const sender = profileMap.get(msgs[0].sender_id);
        lastMessages[convId] = {
          content: msgs[0].content,
          senderName: sender?.name ?? 'Unknown',
          createdAt: msgs[0].created_at,
        };
      }
    }

    // 6. Map everything
    return (conversations || []).map((conv: any) => {
      const convMembers = (allMembers || [])
        .filter((m: any) => m.conversation_id === conv.id)
        .map((m: any) => mapMember(m, profileMap.get(m.user_id)));
      return mapConversation(conv, convMembers, lastMessages[conv.id], userId);
    });
  },

  async getMessages(
    conversationId: string,
    options?: { before?: string; limit?: number }
  ): Promise<ChatMessage[]> {
    const limit = options?.limit ?? 50;

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // Get sender profiles
    const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials, role')
      .in('id', senderIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return (messages || [])
      .map((m: any) => mapMessage(m, profileMap.get(m.sender_id)))
      .reverse(); // chronological order
  },

  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        content_type: 'text',
      })
      .select()
      .single();
    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials, role')
      .eq('id', userId)
      .single();

    return mapMessage(data as any, profile as any);
  },

  async getOrCreateDM(otherUserId: string): Promise<string> {
    const userId = await getCurrentUserId();

    // Check if DM already exists between these two users
    const { data: myConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (myConvs?.length) {
      const convIds = myConvs.map((c: any) => c.conversation_id);

      const { data: otherMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', convIds);

      if (otherMemberships?.length) {
        // Check which of these are DMs
        const sharedConvIds = otherMemberships.map((m: any) => m.conversation_id);
        const { data: dmConvs } = await supabase
          .from('conversations')
          .select('id')
          .in('id', sharedConvIds)
          .eq('type', 'dm')
          .limit(1);

        if (dmConvs?.[0]) return dmConvs[0].id;
      }
    }

    // Create new DM
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'dm', created_by: userId })
      .select()
      .single();
    if (convErr) throw convErr;

    // Add both members
    const { error: memErr } = await supabase
      .from('conversation_members')
      .insert([
        { conversation_id: conv.id, user_id: userId, role: 'owner' },
        { conversation_id: conv.id, user_id: otherUserId, role: 'member' },
      ]);
    if (memErr) throw memErr;

    return conv.id;
  },

  async createGroup(
    name: string,
    description: string | undefined,
    memberIds: string[]
  ): Promise<string> {
    const userId = await getCurrentUserId();

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'group', name, description, created_by: userId })
      .select()
      .single();
    if (convErr) throw convErr;

    const members = [
      { conversation_id: conv.id, user_id: userId, role: 'owner' },
      ...memberIds.map((id) => ({
        conversation_id: conv.id,
        user_id: id,
        role: 'member',
      })),
    ];

    const { error: memErr } = await supabase
      .from('conversation_members')
      .insert(members);
    if (memErr) throw memErr;

    return conv.id;
  },

  async getReachableUsers(): Promise<ReachableUser[]> {
    const userId = await getCurrentUserId();

    // Get user's org IDs
    const { data: orgMemberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);

    if (!orgMemberships?.length) return [];

    const orgIds = orgMemberships.map((m: any) => m.organization_id);

    // Get all members of those orgs (excluding self)
    const { data: orgMembers } = await supabase
      .from('organization_members')
      .select('user_id')
      .in('organization_id', orgIds)
      .neq('user_id', userId);

    if (!orgMembers?.length) return [];

    const userIds = [...new Set(orgMembers.map((m: any) => m.user_id))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials, role')
      .in('id', userIds);

    return (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatar_url ?? undefined,
      initials: p.initials,
      role: p.role ?? '',
      isOnline: false,
    }));
  },
};
