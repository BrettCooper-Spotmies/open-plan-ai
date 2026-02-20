import type {
  ChatMessage,
  Conversation,
  ConversationMember,
  ConversationMemberRole,
  MessageContentType,
  ConversationType,
} from './types';

interface DbProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  initials: string;
  role: string | null;
  last_seen_at?: string | null;
}

interface DbConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface DbConversation {
  id: string;
  type: string;
  name: string | null;
  description: string | null;
  created_by: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export function mapMember(
  dbMember: DbConversationMember,
  profile: DbProfile | undefined
): ConversationMember {
  return {
    id: dbMember.user_id,
    name: profile?.name ?? 'Unknown',
    email: profile?.email ?? '',
    avatarUrl: profile?.avatar_url ?? undefined,
    initials: profile?.initials ?? '??',
    role: dbMember.role as ConversationMemberRole,
    isOnline: false,
    lastSeenAt: profile?.last_seen_at ?? undefined,
  };
}

export function mapMessage(
  dbMsg: DbMessage,
  senderProfile: DbProfile | undefined
): ChatMessage {
  return {
    id: dbMsg.id,
    conversationId: dbMsg.conversation_id,
    senderId: dbMsg.sender_id,
    senderName: senderProfile?.name ?? 'Unknown',
    senderAvatar: senderProfile?.avatar_url ?? undefined,
    senderInitials: senderProfile?.initials ?? '??',
    contentType: dbMsg.content_type as MessageContentType,
    content: dbMsg.content,
    attachments: [],
    createdAt: dbMsg.created_at,
    updatedAt: dbMsg.updated_at,
    isEdited: dbMsg.updated_at !== dbMsg.created_at,
  };
}

export function mapConversation(
  dbConv: DbConversation,
  members: ConversationMember[],
  lastMessage?: { content: string; senderName: string; createdAt: string },
  currentUserId?: string
): Conversation {
  // For DMs, name is the other person's name
  let name = dbConv.name ?? '';
  if (dbConv.type === 'dm' && currentUserId) {
    const other = members.find((m) => m.id !== currentUserId);
    if (other) name = other.name;
  }

  return {
    id: dbConv.id,
    type: dbConv.type as ConversationType,
    name,
    description: dbConv.description ?? undefined,
    avatarUrl: undefined,
    members,
    lastMessage,
    lastMessageAt: dbConv.last_message_at,
    createdAt: dbConv.created_at,
  };
}
