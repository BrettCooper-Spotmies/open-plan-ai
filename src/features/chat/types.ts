export type ConversationType = 'dm' | 'group';
export type MessageContentType = 'text' | 'system' | 'file';
export type ConversationMemberRole = 'owner' | 'admin' | 'member';

export interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: string;
}

export interface ConversationMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  role: ConversationMemberRole;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  contentType: MessageContentType;
  content: string;
  attachments: MessageAttachment[];
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  deletedAt?: string;
  deletedByName?: string;
  readReceipts?: ReadReceipt[];
  reactions?: MessageReaction[];
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'read';
  isOptimistic?: boolean;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  description?: string;
  avatarUrl?: string;
  members: ConversationMember[];
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
    status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'read';
  };
  lastMessageAt: string;
  createdAt: string;
}

export interface ReachableUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  role: string;
  isOnline: boolean;
}
