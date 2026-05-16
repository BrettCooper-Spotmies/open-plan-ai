import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type { Conversation, ChatMessage, ReachableUser, ReadReceipt, MessageReaction } from '@/features/chat/types';

/** Dispatched when the current user is added to conversation_members so chat UI can re-check send access. */
export const CHAT_ACCESS_INVALIDATE_EVENT = 'openplan-invalidate-conversation-access';

export const chatService = {
  async getConversationAccessState(
    _conversationId: string
  ): Promise<{ readOnly: boolean; leftAt: string | null; joinedAt: string | null }> {
    return { readOnly: false, leftAt: null, joinedAt: new Date().toISOString() };
  },

  async getConversations(): Promise<Conversation[]> {
    return apiClient.get(ENDPOINTS.CONVERSATIONS.LIST);
  },

  async getConversationById(conversationId: string): Promise<Conversation> {
    return apiClient.get(ENDPOINTS.CONVERSATIONS.BY_ID(conversationId));
  },

  async getOrCreateDM(otherUserId: string): Promise<string> {
    const conv = await apiClient.post<Conversation>(ENDPOINTS.CONVERSATIONS.CREATE, {
      type: 'dm',
      userId: otherUserId,
    });
    return conv.id;
  },

  async createGroup(
    name: string,
    description: string | undefined,
    memberIds: string[],
    _avatarUrl?: string
  ): Promise<string> {
    const conv = await apiClient.post<Conversation>(ENDPOINTS.CONVERSATIONS.CREATE, {
      type: 'group',
      name,
      description,
      memberIds,
    });
    return conv.id;
  },

  async getMessages(
    conversationId: string,
    options?: { before?: string; limit?: number }
  ): Promise<ChatMessage[]> {
    const query = new URLSearchParams();
    if (options?.before) query.set('before', options.before);
    if (options?.limit) query.set('limit', String(options.limit));
    const qs = query.toString() ? '?' + query.toString() : '';
    return apiClient.get(ENDPOINTS.CONVERSATIONS.MESSAGES(conversationId) + qs);
  },

  async sendMessage(
    conversationId: string,
    content: string,
    _userId?: string,
    replyToMessageId?: string
  ): Promise<ChatMessage> {
    return apiClient.post(ENDPOINTS.CONVERSATIONS.MESSAGES(conversationId), {
      content,
      type: 'text',
      replyToMessageId: replyToMessageId || null,
    });
  },

  async editMessage(messageId: string, newContent: string): Promise<void> {
    await apiClient.patch(ENDPOINTS.COMMENTS.UPDATE(messageId), { content: newContent });
  },

  async deleteMessage(messageId: string, _senderName: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.COMMENTS.DELETE(messageId));
  },

  async markConversationAsRead(conversationId: string): Promise<void> {
    await apiClient.post(ENDPOINTS.CONVERSATIONS.READ(conversationId), {});
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

  async getReachableUsers(): Promise<ReachableUser[]> {
    try {
      return await apiClient.get(`${ENDPOINTS.USERS.SEARCH}?q=`);
    } catch {
      return [];
    }
  },

  async getReadReceipts(_messageIds: string[]): Promise<Record<string, ReadReceipt[]>> {
    return {};
  },

  async getReactions(
    _messageIds: string[],
    _currentUserId: string
  ): Promise<Record<string, MessageReaction[]>> {
    return {};
  },

  async toggleReaction(_messageId: string, _emoji: string): Promise<void> {
    // Not yet implemented in backend
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
