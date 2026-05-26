import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type { Conversation, ChatMessage, ReachableUser, ReadReceipt, MessageReaction } from '@/features/chat/types';
import { resolveFileUrl } from '@/utils/fileUrl';

/** Map backend MessageResponse (camelCase) to frontend ChatMessage (flat senderId). */
function mapChatMessage(raw: any): ChatMessage {
  const fileUrl = raw.fileUrl ?? raw.file_url ?? null;
  const resolvedFileUrl = fileUrl ? (resolveFileUrl(fileUrl) ?? fileUrl) : undefined;

  return {
    id: raw.id,
    conversationId: raw.conversationId ?? raw.conversation_id ?? '',
    senderId: raw.senderId ?? raw.sender_id ?? raw.sender?.id ?? '',
    senderName: raw.senderName ?? raw.sender?.name ?? raw.sender_name ?? 'Unknown',
    senderAvatar: raw.senderAvatar ?? raw.sender?.avatarUrl ?? raw.sender?.avatar_url ?? undefined,
    senderInitials: raw.senderInitials ?? raw.sender?.initials ?? (raw.sender?.name ?? '').slice(0, 2).toUpperCase() ?? '??',
    contentType: (raw.contentType ?? raw.content_type ?? 'text') as any,
    content: raw.content ?? '',
    attachments: resolvedFileUrl ? [{
      id: raw.id,
      type: (raw.contentType ?? raw.content_type ?? 'file') === 'image' ? 'image' : 'file',
      url: resolvedFileUrl,
      name: raw.fileName ?? raw.file_name ?? raw.content ?? 'file',
      size: raw.fileSize ?? raw.file_size ?? 0,
      mimeType: raw.fileMimeType ?? raw.file_mime_type ?? '',
    }] : (raw.attachments ?? []),
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? raw.createdAt ?? new Date().toISOString(),
    isEdited: false,
    deletedAt: raw.deletedAt ?? raw.deleted_at ?? undefined,
    replyToMessageId: raw.replyToMessageId ?? raw.reply_to_message_id ?? undefined,
  };
}

/** Map the backend ConversationResponse shape to the frontend Conversation type. */
function mapConversation(raw: any): Conversation {
  const members = (raw.members ?? []).map((m: any) => ({
    id: m.userId ?? m.id,
    userId: m.userId ?? m.id,
    name: m.name ?? '',
    avatarUrl: m.avatarUrl ?? m.avatar_url ?? null,
    initials: m.initials ?? (m.name ?? '').slice(0, 2).toUpperCase(),
    role: m.role ?? 'member',
    lastSeenAt: m.lastSeenAt ?? m.last_seen_at ?? null,
    joinedAt: m.joinedAt ?? m.joined_at ?? null,
    leftAt: m.leftAt ?? m.left_at ?? null,
  }));

  return {
    id: raw.id,
    type: raw.isGroupChat ? 'group' : 'dm',
    name: raw.title ?? raw.name ?? '',
    title: raw.title ?? raw.name ?? null,
    description: raw.description ?? undefined,
    avatarUrl: raw.avatarUrl ?? raw.avatar_url ?? undefined,
    members,
    lastMessage: raw.lastMessage
      ? { content: raw.lastMessage.content, senderName: '', createdAt: raw.lastMessage.createdAt }
      : undefined,
    lastMessageAt: raw.updatedAt ?? raw.lastMessageAt ?? raw.createdAt ?? new Date().toISOString(),
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

/** Dispatched when the current user is added to conversation_members so chat UI can re-check send access. */
export const CHAT_ACCESS_INVALIDATE_EVENT = 'openplan-invalidate-conversation-access';

export const chatService = {
  async getConversationAccessState(
    _conversationId: string
  ): Promise<{ readOnly: boolean; leftAt: string | null; joinedAt: string | null }> {
    return { readOnly: false, leftAt: null, joinedAt: new Date().toISOString() };
  },

  async getConversations(): Promise<Conversation[]> {
    const data = await apiClient.get<any[]>(ENDPOINTS.CONVERSATIONS.LIST);
    return (data || []).map(mapConversation);
  },

  async getConversationById(conversationId: string): Promise<Conversation> {
    const data = await apiClient.get<any>(ENDPOINTS.CONVERSATIONS.BY_ID(conversationId));
    return mapConversation(data);
  },

  async getOrCreateDM(otherUserId: string): Promise<string> {
    const data = await apiClient.post<any>(ENDPOINTS.CONVERSATIONS.CREATE, {
      type: 'direct',
      memberIds: [otherUserId],
    });
    return mapConversation(data).id;
  },

  async createGroup(
    name: string,
    description: string | undefined,
    memberIds: string[],
    _avatarUrl?: string
  ): Promise<string> {
    const data = await apiClient.post<any>(ENDPOINTS.CONVERSATIONS.CREATE, {
      type: 'group',
      name,
      description,
      memberIds,
    });
    return mapConversation(data).id;
  },

  async getMessages(
    conversationId: string,
    options?: { before?: string; limit?: number }
  ): Promise<ChatMessage[]> {
    const query = new URLSearchParams();
    if (options?.before) query.set('before', options.before);
    if (options?.limit) query.set('limit', String(options.limit));
    const qs = query.toString() ? '?' + query.toString() : '';
    const data = await apiClient.get<any[]>(ENDPOINTS.CONVERSATIONS.MESSAGES(conversationId) + qs);
    return (data || []).map(mapChatMessage);
  },

  async sendMessage(
    conversationId: string,
    content: string,
    _userId?: string,
    replyToMessageId?: string
  ): Promise<ChatMessage> {
    const data = await apiClient.post<any>(ENDPOINTS.CONVERSATIONS.MESSAGES(conversationId), {
      content,
      type: 'text',
      replyToMessageId: replyToMessageId || null,
    });
    return mapChatMessage(data);
  },

  async editMessage(messageId: string, newContent: string): Promise<void> {
    await apiClient.patch(ENDPOINTS.COMMENTS.UPDATE(messageId), { content: newContent });
  },

  async deleteMessage(messageId: string, _senderName: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.COMMENTS.DELETE(messageId));
  },

  async markConversationAsRead(conversationId: string): Promise<void> {
    await apiClient.patch(ENDPOINTS.CONVERSATIONS.READ(conversationId), {});
  },

  async getMembers(conversationId: string): Promise<unknown[]> {
    return apiClient.get(ENDPOINTS.CONVERSATIONS.MEMBERS(conversationId));
  },

  async addMemberToGroup(conversationId: string, userId: string): Promise<void> {
    await apiClient.post(ENDPOINTS.CONVERSATIONS.MEMBERS(conversationId), { userId });
  },

  async addMembersToGroup(conversationId: string, userIds: string[]): Promise<void> {
    await Promise.all(userIds.map((uid) => this.addMemberToGroup(conversationId, uid)));
  },

  async removeMemberFromGroup(conversationId: string, userId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.CONVERSATIONS.MEMBER(conversationId, userId));
  },

  async updateMemberRole(
    conversationId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await apiClient.patch(ENDPOINTS.CONVERSATIONS.MEMBER(conversationId, userId), { role });
  },

  async updateGroupDetails(
    conversationId: string,
    updates: { name?: string; description?: string; avatar_url?: string }
  ): Promise<void> {
    await apiClient.patch(ENDPOINTS.CONVERSATIONS.BY_ID(conversationId), updates);
  },

  async searchUsers(query: string): Promise<ReachableUser[]> {
    return apiClient.get(`${ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(query)}`);
  },

  async getReachableUsers(orgId?: string): Promise<ReachableUser[]> {
    try {
      const params = orgId ? `?q=&orgId=${encodeURIComponent(orgId)}` : '?q=';
      return await apiClient.get(`${ENDPOINTS.USERS.SEARCH}${params}`);
    } catch {
      return [];
    }
  },

  async getReadReceipts(_messageIds: string[]): Promise<Record<string, ReadReceipt[]>> {
    return {};
  },

  async getReactions(
    messageIds: string[],
    _currentUserId: string
  ): Promise<Record<string, MessageReaction[]>> {
    if (messageIds.length === 0) return {};
    const ids = messageIds.join(',');
    return apiClient.get(`${ENDPOINTS.REACTIONS.BULK}?ids=${ids}`);
  },

  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    await apiClient.post(ENDPOINTS.REACTIONS.TOGGLE(messageId), { emoji });
  },

  async getSharedFiles(
    _conversationId: string
  ): Promise<
    { fileName: string; fileSize: number; mimeType: string; url?: string; storagePath?: string; createdAt: string }[]
  > {
    return [];
  },

  async getChatAttachmentDownloadUrl(file: {
    storagePath?: string;
    url?: string;
    fileName?: string;
  }): Promise<string> {
    if (file.url) return file.url;
    throw new Error('Attachment URL is not available');
  },

  async downloadChatAttachment(file: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath?: string;
    url?: string;
  }): Promise<void> {
    const downloadUrl = await this.getChatAttachmentDownloadUrl(file);
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to download attachment');
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

  async uploadGroupAvatar(_file: File): Promise<string> {
    throw new Error('Group avatar upload is not yet supported in this backend version.');
  },

  async sendSystemMessage(conversationId: string, content: string): Promise<void> {
    await apiClient.post(ENDPOINTS.CONVERSATIONS.MESSAGES(conversationId), {
      content,
      type: 'system',
    });
  },

  // Project chat group stubs — backend handles group creation via project creation
  async ensureProjectGroup(_projectId: string): Promise<string> {
    throw new Error('Project group management is handled server-side.');
  },

  async getProjectGroupConversationId(_projectId: string): Promise<string | null> {
    return null;
  },

  async getProjectIdForConversation(_conversationId: string): Promise<string | null> {
    return null;
  },

  async syncProjectGroupMembers(_projectId: string): Promise<void> {
    // No-op — backend handles this server-side
  },

  async retainProjectChatMembershipAfterRemoval(
    _projectId: string,
    _userIds: string[]
  ): Promise<void> {
    // No-op — backend handles this server-side
  },

  async forceRemoveProjectChatMembers(
    _projectId: string,
    _userIds: string[]
  ): Promise<void> {
    // No-op — backend handles this server-side
  },
};
