import { supabase } from '@/integrations/supabase/client';
import { mapConversation, mapMember, mapMessage } from '@/features/chat/chat.mappers';
import type { Conversation, ChatMessage, ReachableUser, ReadReceipt, MessageReaction } from '@/features/chat/types';

interface ChatFilePayload {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath?: string;
  url?: string;
}

function extractStoragePathFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/chat-attachments/';
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    const encodedPath = parsed.pathname.slice(index + marker.length);
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export const chatService = {
  async getChatAttachmentDownloadUrl(file: { storagePath?: string; url?: string; fileName?: string }): Promise<string> {
    const resolvedPath = file.storagePath || (file.url ? extractStoragePathFromPublicUrl(file.url) : null);

    if (resolvedPath) {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(resolvedPath, 60, {
          download: file.fileName || true,
        });

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to create secure download URL');
      }

      return data.signedUrl;
    }

    if (file.url) {
      return file.url;
    }

    throw new Error('Attachment URL is not available');
  },

  async downloadChatAttachment(file: ChatFilePayload): Promise<void> {
    const downloadUrl = await this.getChatAttachmentDownloadUrl(file);
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error('Failed to download attachment');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = file.fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  },

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
    const allProfiles: any[] = [];
    const BATCH_SIZE = 150;
    for (let i = 0; i < memberUserIds.length; i += BATCH_SIZE) {
      const chunk = memberUserIds.slice(i, i + BATCH_SIZE);
      const { data: chunkProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, initials, role, last_seen_at')
        .in('id', chunk);
      if (chunkProfiles) allProfiles.push(...chunkProfiles);
    }

    const profileMap = new Map((allProfiles).map((p: any) => [p.id, p]));

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
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // Get sender profiles
    const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id))];
    const allProfiles = [];
    const BATCH_SIZE = 150;
    for (let i = 0; i < senderIds.length; i += BATCH_SIZE) {
      const chunk = senderIds.slice(i, i + BATCH_SIZE);
      const { data: chunkProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, initials, role')
        .in('id', chunk);
      if (chunkProfiles) allProfiles.push(...chunkProfiles);
    }

    const profileMap = new Map((allProfiles).map((p: any) => [p.id, p]));

    return (messages || [])
      .map((m: any) => mapMessage(m, profileMap.get(m.sender_id)))
      .reverse(); // chronological order
  },

  async editMessage(messageId: string, newContent: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw error;
  },

  async deleteMessage(messageId: string, senderName: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by_name: senderName,
      } as any)
      .eq('id', messageId);
    if (error) throw error;
  },

  async sendMessage(conversationId: string, content: string, userId?: string): Promise<ChatMessage> {
    const finalUserId = userId || await getCurrentUserId();

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: finalUserId,
        content,
        content_type: 'text',
      })
      .select()
      .single();
    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials, role')
      .eq('id', finalUserId)
      .single();

    return mapMessage(data as any, profile as any);
  },

  /**
   * Mark all messages in a conversation as read for the current user.
   * Uses upsert with ignoreDuplicates so re-opening is always safe.
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    const userId = await getCurrentUserId();

    // Fetch all (non-deleted) message IDs in the conversation
    const { data: messages, error: msgErr } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null);
    if (msgErr) throw msgErr;
    if (!messages?.length) return;

    const rows = messages.map((m: any) => ({
      message_id: m.id,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('message_reads')
      .upsert(rows, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
  },

  /**
   * Fetch read receipts for the given message IDs.
   * Returns a map of messageId → ReadReceipt[].
   */
  async getReadReceipts(messageIds: string[]): Promise<Record<string, ReadReceipt[]>> {
    if (!messageIds.length) return {};

    const { data, error } = await supabase
      .from('message_reads')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds);
    if (error) throw error;

    const map: Record<string, ReadReceipt[]> = {};
    for (const row of data || []) {
      const r: ReadReceipt = {
        messageId: row.message_id,
        userId: row.user_id,
        readAt: row.read_at,
      };
      if (!map[row.message_id]) map[row.message_id] = [];
      map[row.message_id].push(r);
    }
    return map;
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
    memberIds: string[],
    avatarUrl?: string
  ): Promise<string> {
    const userId = await getCurrentUserId();

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        description,
        created_by: userId,
        avatar_url: avatarUrl || null
      })
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

  async updateGroupDetails(
    conversationId: string,
    updates: { name?: string; description?: string; avatar_url?: string }
  ): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .eq('type', 'group');
    if (error) throw error;
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

    const allProfiles: any[] = [];
    const BATCH_SIZE = 150;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const chunk = userIds.slice(i, i + BATCH_SIZE);
      const { data: chunkProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, initials, role')
        .in('id', chunk);
      if (chunkProfiles) allProfiles.push(...chunkProfiles);
    }

    return (allProfiles).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatar_url ?? undefined,
      initials: p.initials,
      role: p.role ?? '',
      isOnline: false,
    }));
  },

  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    const userId = await getCurrentUserId();

    // Check if user already has any reaction to this message
    const { data: existingReactions } = await supabase
      .from('message_reactions')
      .select('id, emoji')
      .eq('message_id', messageId)
      .eq('user_id', userId);

    let sameReactionFound = false;

    if (existingReactions && existingReactions.length > 0) {
      // Find if one of them is the exact same reaction
      sameReactionFound = existingReactions.some((r: any) => r.emoji === emoji);

      // Delete all existing reactions from this user on this message
      const idsToDelete = existingReactions.map((r: any) => r.id);
      await supabase.from('message_reactions').delete().in('id', idsToDelete);
    }

    // Only insert the new reaction if they didn't just click the same one
    // (If they clicked the same one, it means they are toggling it OFF)
    if (!sameReactionFound) {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });
    }
  },

  async getReactions(messageIds: string[], currentUserId: string): Promise<Record<string, MessageReaction[]>> {
    if (!messageIds.length) return {};

    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);
    if (error) throw error;

    const map: Record<string, Record<string, { count: number; userIds: string[] }>> = {};
    for (const row of data || []) {
      if (!map[row.message_id]) map[row.message_id] = {};
      if (!map[row.message_id][row.emoji]) map[row.message_id][row.emoji] = { count: 0, userIds: [] };
      map[row.message_id][row.emoji].count++;
      map[row.message_id][row.emoji].userIds.push(row.user_id);
    }

    const result: Record<string, MessageReaction[]> = {};
    for (const [msgId, emojis] of Object.entries(map)) {
      result[msgId] = Object.entries(emojis).map(([emoji, info]) => ({
        emoji,
        count: info.count,
        userIds: info.userIds,
        reactedByMe: info.userIds.includes(currentUserId),
      }));
    }
    return result;
  },

  async addMembersToGroup(conversationId: string, userIds: string[]): Promise<void> {
    const members = userIds.map((id) => ({
      conversation_id: conversationId,
      user_id: id,
      role: 'member',
    }));

    const { error } = await supabase
      .from('conversation_members')
      .insert(members);
    if (error) throw error;
  },

  async addMemberToGroup(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_members')
      .insert({ conversation_id: conversationId, user_id: userId, role: 'member' });
    if (error) throw error;
  },

  async removeMemberFromGroup(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async getSharedFiles(conversationId: string): Promise<{ fileName: string; fileSize: number; mimeType: string; url?: string; storagePath?: string; createdAt: string }[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('content, created_at')
      .eq('conversation_id', conversationId)
      .eq('content_type', 'file')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    return (data || []).map((msg: any) => {
      try {
        const parsed = JSON.parse(msg.content);
        if (!parsed.fileName || (!parsed.storagePath && !parsed.url)) {
          return null;
        }
        return {
          fileName: parsed.fileName,
          fileSize: parsed.fileSize,
          mimeType: parsed.mimeType,
          url: parsed.url,
          storagePath: parsed.storagePath,
          createdAt: msg.created_at,
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as any[];
  },

  async uploadGroupAvatar(file: File): Promise<string> {
    const userId = await getCurrentUserId();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async updateMemberRole(conversationId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    const { data, error } = await supabase
      .from('conversation_members')
      .update({ role })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Failed to update member role: No matching membership found');
    }
  },

  async sendSystemMessage(conversationId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        content,
        content_type: 'system',
        sender_id: await getCurrentUserId(), // System messages still have a sender in this schema
      });
    if (error) throw error;
  },
};
