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
  reply_to_message_id?: string | null;
}

interface DbConversation {
  id: string;
  type: string;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
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
  dbMsg: (DbMessage & { deleted_by_name?: string | null }) | any,
  senderProfile: DbProfile | undefined | null
): ChatMessage {
  // Handle both snake_case (Supabase/DB) and camelCase (SocketIO/REST API) shapes
  const m = dbMsg as any;
  const senderId = m.sender_id ?? m.senderId ?? m.sender?.id ?? '';
  const conversationId = m.conversation_id ?? m.conversationId ?? '';
  const createdAt = m.created_at ?? m.createdAt ?? new Date().toISOString();
  const updatedAt = m.updated_at ?? m.updatedAt ?? createdAt;
  const deletedAt = m.deleted_at ?? m.deletedAt ?? null;
  const contentType = m.content_type ?? m.contentType ?? 'text';

  // For SocketIO messages, sender info is nested in msg.sender
  const senderName = senderProfile?.name ?? m.sender?.name ?? m.senderName ?? 'Unknown';
  const senderAvatar = senderProfile?.avatar_url ?? m.sender?.avatarUrl ?? m.sender?.avatar_url ?? undefined;
  const senderInitials = senderProfile?.initials ?? m.sender?.initials ?? senderName?.slice(0, 2)?.toUpperCase() ?? '??';

  return {
    id: m.id,
    conversationId,
    senderId,
    senderName,
    senderAvatar,
    senderInitials,
    contentType: contentType as MessageContentType,
    content: m.content,
    attachments: [],
    createdAt,
    updatedAt,
    isEdited: updatedAt !== createdAt && !deletedAt,
    deletedAt: deletedAt ?? undefined,
    deletedByName: m.deleted_by_name ?? m.deletedByName ?? undefined,
    replyToMessageId: m.reply_to_message_id ?? m.replyToMessageId ?? undefined,
  };
}

export function mapConversation(
  dbConv: DbConversation,
  members: ConversationMember[],
  lastMessage?: { content: string; senderName: string; createdAt: string; status?: any },
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
    avatarUrl: dbConv.avatar_url ?? undefined,
    members,
    lastMessage,
    lastMessageAt: dbConv.last_message_at,
    createdAt: dbConv.created_at,
  };
}
