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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
  logContext: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  return new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(`[chatService] ${logContext} timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        console.warn(`[chatService] ${logContext} failed, using fallback`, {
          error: err instanceof Error ? err.message : String(err),
        });
        resolve(fallback);
      });
  });
}

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

const conversationsCache = new Map<string, { expiresAt: number; value: Conversation[] }>();

/** Dispatched when the current user is added to conversation_members so chat UI can re-check send access. */
export const CHAT_ACCESS_INVALIDATE_EVENT = 'openplan-invalidate-conversation-access';

export const chatService = {
  async getConversationAccessState(conversationId: string): Promise<{ readOnly: boolean; leftAt: string | null; joinedAt: string | null }> {
    const timeoutMs = Number(import.meta.env.VITE_CHAT_CONVERSATION_ACCESS_TIMEOUT_MS ?? 5000);
    const fallback = { readOnly: true, leftAt: null, joinedAt: null };

    const internal = (async () => {
      const userId = await getCurrentUserId();

      type ProjectChatGroupRow = { project_id: string | null };
      type ProjectChatMemberAccessRow = { left_at: string | null };

      const [membershipRes, mappingRes] = await Promise.all([
        supabase
          .from('conversation_members')
          .select('user_id, joined_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('project_chat_groups')
          .select('project_id')
          .eq('conversation_id', conversationId)
          .maybeSingle(),
      ]);

      const { data: membership } = membershipRes;
      const { data: mapping } = mappingRes as { data: ProjectChatGroupRow | null };

      const isConversationMember = !!membership;
      const joinedAt =
        membership && typeof (membership as { joined_at?: string | null }).joined_at === 'string'
          ? (membership as { joined_at?: string | null }).joined_at ?? null
          : null;

      if (!mapping?.project_id) {
        return { readOnly: false, leftAt: null, joinedAt };
      }

      // Project group: membership is authoritative for sending. Skip project_chat_member_access
      // here so a slow/failed history row never blocks people who are already in the group.
      if (isConversationMember) {
        return { readOnly: false, leftAt: null, joinedAt };
      }

      const { data: accessRows, error: accessError } = await supabase
        .from('project_chat_member_access')
        .select('left_at')
        .eq('project_id', mapping.project_id)
        .eq('user_id', userId)
        .limit(2);

      if (accessError) throw accessError;

      if (accessRows && accessRows.length > 1) {
        console.warn('[chatService.getConversationAccessState] multiple access rows found', {
          projectId: mapping.project_id,
          userId,
          rows: accessRows.length,
        });
      }

      const leftAt = (accessRows?.[0]?.left_at as ProjectChatMemberAccessRow['left_at'] | undefined) ?? null;

      if (leftAt) {
        const leftAtTs = new Date(leftAt).getTime();
        if (!Number.isFinite(leftAtTs)) {
          console.warn('[chatService.getConversationAccessState] invalid left_at timestamp; treating as null', {
            conversationId,
          });
          return { readOnly: false, leftAt: null, joinedAt: null };
        }
      }

      const readOnly = !!leftAt && !isConversationMember;
      return { readOnly, leftAt, joinedAt };
    })();

    return withTimeout(internal, timeoutMs, fallback, 'getConversationAccessState');
  },

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

    const cacheTtlMs = Number(import.meta.env.VITE_CHAT_CONVERSATIONS_CACHE_TTL_MS ?? 5000);
    const cached = conversationsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // 1. Get conversation IDs for this user
    const { data: memberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);
    if (memErr) throw memErr;
    if (!memberships?.length) return [];

    let convIds = memberships.map((m: any) => m.conversation_id);

    // Safety filter: hide project-chat conversations for soft-deleted projects.
    // DB trigger should clean these, but this prevents stale UI if data lags.
    if (convIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mappings } = await (supabase.from('project_chat_groups' as any) as any)
        .select('conversation_id, project_id')
        .in('conversation_id', convIds);

      if (mappings?.length) {
        const projectIds = mappings.map((m: any) => m.project_id);
        const { data: activeProjects } = await supabase
          .from('projects')
          .select('id')
          .in('id', projectIds)
          .is('deleted_at', null);

        const activeProjectIds = new Set((activeProjects || []).map((p: any) => p.id));
        const deletedConversationIds = new Set(
          mappings
            .filter((m: any) => !activeProjectIds.has(m.project_id))
            .map((m: any) => m.conversation_id)
        );

        convIds = convIds.filter((id: string) => !deletedConversationIds.has(id));
        if (convIds.length === 0) return [];
      }
    }

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

    // 5. Get last message for each conversation (single bulk query, no N+1)
    const lastMessages: Record<string, any> = {};
    if (convIds.length > 0) {
      const { data: allLastMsgs } = await supabase
        .from('chat_messages')
        .select('conversation_id, content, sender_id, created_at')
        .in('conversation_id', convIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Keep only the first (latest) message per conversation
      if (allLastMsgs) {
        for (const msg of allLastMsgs) {
          if (!lastMessages[msg.conversation_id]) {
            const sender = profileMap.get(msg.sender_id);
            lastMessages[msg.conversation_id] = {
              content: msg.content,
              senderName: sender?.name ?? 'Unknown',
              createdAt: msg.created_at,
            };
          }
        }
      }
    }

    // 6. Map everything (drop stale members with missing profile rows)
    const mapped = (conversations || []).map((conv: any) => {
      const convMembers = (allMembers || [])
        .filter((m: any) => m.conversation_id === conv.id)
        .map((m: any) => {
          const profile = profileMap.get(m.user_id);
          if (!profile || !profile.name || !String(profile.name).trim()) return null;
          return mapMember(m, profile);
        })
        .filter((m: any) => m !== null);
      return mapConversation(conv, convMembers, lastMessages[conv.id], userId);
    });

    conversationsCache.set(userId, { expiresAt: Date.now() + cacheTtlMs, value: mapped });
    return mapped;
  },

  async getMessages(
    conversationId: string,
    options?: { before?: string; limit?: number }
  ): Promise<ChatMessage[]> {
    const limit = options?.limit ?? 50;
    const access = await this.getConversationAccessState(conversationId);

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }
    const joinedAtTs = access.joinedAt ? new Date(access.joinedAt).getTime() : NaN;
    // New members can only see messages from their join time onward.
    if (access.joinedAt && Number.isFinite(joinedAtTs)) {
      query = query.gte('created_at', access.joinedAt);
    }
    if (access.readOnly) {
      const leftAtTs = access.leftAt ? new Date(access.leftAt).getTime() : NaN;
      // Only apply the leftAt cutoff when it's a valid timestamp string.
      if (access.leftAt && Number.isFinite(leftAtTs)) {
        query = query.lte('created_at', access.leftAt);
      }
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
    // Defence-in-depth: only allow editing your own messages (RLS also enforces this)
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('chat_messages')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId);
    if (error) throw error;
  },

  async deleteMessage(messageId: string, senderName: string): Promise<void> {
    // Defence-in-depth: only allow deleting your own messages (RLS also enforces this)
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('chat_messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by_name: senderName,
      } as any)
      .eq('id', messageId)
      .eq('sender_id', userId);
    if (error) throw error;
  },

  async sendMessage(conversationId: string, content: string, userId?: string, replyToMessageId?: string): Promise<ChatMessage> {
    const access = await this.getConversationAccessState(conversationId);
    if (access.readOnly) {
      throw new Error('You have been removed from this project and cannot send new messages in this group.');
    }

    const finalUserId = userId || await getCurrentUserId();

    let data: any = null;
    let error: any = null;
    const payloadWithReply = {
      conversation_id: conversationId,
      sender_id: finalUserId,
      content,
      content_type: 'text',
      reply_to_message_id: replyToMessageId || null,
    } as any;

    ({ data, error } = await supabase
      .from('chat_messages')
      .insert(payloadWithReply)
      .select()
      .single());

    // Backward compatibility: allow sending even if DB migration for replies
    // has not been applied yet (column reply_to_message_id missing).
    const missingReplyColumn =
      !!error && typeof error.message === 'string' && /reply_to_message_id|column .* does not exist/i.test(error.message);
    if (missingReplyColumn) {
      ({ data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: finalUserId,
          content,
          content_type: 'text',
        })
        .select()
        .single());
    }
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
    const access = await this.getConversationAccessState(conversationId);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('content, created_at')
      .eq('conversation_id', conversationId)
      .eq('content_type', 'file')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    const joinedAtTs = access.joinedAt ? new Date(access.joinedAt).getTime() : NaN;
    const leftAtTs = access.leftAt ? new Date(access.leftAt).getTime() : NaN;

    const visibilityFiltered = (data || []).filter((msg: any) => {
      const createdAtTs = new Date(msg.created_at).getTime();
      if (!Number.isFinite(createdAtTs)) return false;
      if (Number.isFinite(joinedAtTs) && createdAtTs < joinedAtTs) return false;
      if (access.readOnly && Number.isFinite(leftAtTs) && createdAtTs > leftAtTs) return false;
      return true;
    });

    return visibilityFiltered.map((msg: any) => {
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

  async ensureProjectGroup(projectId: string): Promise<string> {
    type EnsureProjectChatGroupArgs = { p_project_id: string };
    const { data, error } = await supabase.rpc<string>('ensure_project_chat_group', {
      p_project_id: projectId,
    } satisfies EnsureProjectChatGroupArgs);
    if (error) throw error;
    return data as string;
  },

  async getProjectGroupConversationId(projectId: string): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('project_chat_groups' as any) as any)
      .select('conversation_id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return (data?.conversation_id as string | undefined) ?? null;
  },

  async getProjectIdForConversation(conversationId: string): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('project_chat_groups' as any) as any)
      .select('project_id')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (error) throw error;
    return (data?.project_id as string | undefined) ?? null;
  },

  async syncProjectGroupMembers(projectId: string): Promise<void> {
    const { error } = await supabase.rpc('sync_project_chat_group_members', {
      p_project_id: projectId,
    } as { p_project_id: string });
    if (error) throw error;
  },

  /**
   * Call before removing users from the project when they should stay in the
   * project group chat. No-op if the project has no group chat yet.
   */
  async retainProjectChatMembershipAfterRemoval(projectId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const { error } = await supabase.rpc('set_project_chat_retain_membership_batch', {
      p_project_id: projectId,
      p_user_ids: userIds,
    } as { p_project_id: string; p_user_ids: string[] });
    if (error) throw error;
  },

  async forceRemoveProjectChatMembers(projectId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const { error } = await supabase.rpc('force_remove_project_chat_members', {
      p_project_id: projectId,
      p_user_ids: userIds,
    } as { p_project_id: string; p_user_ids: string[] });
    if (error) throw error;
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
