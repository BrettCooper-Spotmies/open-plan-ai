# Chat Feature — Full Implementation Prompt

> **Purpose:** This document is a complete, self-contained implementation prompt for replacing the mock chat feature in Open Plan AI with a fully dynamic, real-time, production-ready implementation. It is designed to be pasted into any AI coding platform (Cursor, Bolt, Lovable, etc.).
>
> **Architecture Philosophy:** The real-time transport layer is intentionally abstracted behind an interface so we can start with Supabase Realtime today and swap to Socket.io, Ably, Pusher, or any other provider in the future — without touching a single UI component.

---

## Project Overview

- **Framework:** React + TypeScript + Vite
- **Backend (current):** Supabase (PostgreSQL + Auth + Realtime)
- **State Management:** Zustand
- **Toast Notifications:** `sonner`
- **Supabase client:** imported from `@/integrations/supabase/client`
- **Project root:** All paths below are relative to `src/`

---

## Current Chat File Structure

```
src/features/chat/
  Chat.tsx                       ← main page (currently reads mock data)
  mockData.ts                    ← all data is mocked here (to be replaced)
  types.ts                       ← TypeScript types (DO NOT MODIFY)
  stores/
    useChatStore.ts              ← Zustand store for UI state
  components/
    ConversationList.tsx         ← reads mockConversations
    MessageArea.tsx              ← reads mockMessages
    MessageInput.tsx             ← fakes send with toast
    NewDMDialog.tsx              ← reads mockReachableUsers + mockConversations
    NewGroupDialog.tsx           ← reads mockReachableUsers
    ChatHeader.tsx
    DetailPanel.tsx
    ConversationItem.tsx
    EmptyState.tsx
    OnlineStatus.tsx
    MessageBubble.tsx
    MessageDateDivider.tsx
    SystemMessage.tsx
    TypingIndicator.tsx
    UnreadBadge.tsx
```

---

## Existing TypeScript Types — `src/features/chat/types.ts`

**DO NOT CHANGE THESE.** All service mappers must output these exact shapes.

```typescript
export type ConversationType = 'dm' | 'group';
export type MessageContentType = 'text' | 'system';
export type ConversationMemberRole = 'owner' | 'admin' | 'member';

export interface ConversationMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  role: ConversationMemberRole;
  isOnline: boolean;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
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
```

---

## Existing Database Tables (Already in Supabase)

- `profiles` — `id`, `name`, `email`, `avatar_url`, `initials`
- `organizations` — `id`, `name`
- `organization_members` — `org_id`, `user_id`, `role`

---

## Architecture Design

### Core Principle — Transport Abstraction

The real-time transport (WebSocket, Supabase Realtime, Socket.io, Ably, etc.) must be **fully abstracted** behind a TypeScript interface called `IChatTransport`. The rest of the application — hooks, components, Zustand store — must never import from `@supabase/...` or any transport-specific library directly. They only talk to the interface.

This means:

```
UI Components
     ↓
Custom Hooks (useChatData.ts)
     ↓
Chat Service (chat.service.ts)    ← only file that knows Supabase
     ↓
Transport Interface (IChatTransport)
     ↓
[SupabaseChatTransport]           ← current implementation
[SocketIOTransport]               ← future drop-in replacement
[AblyTransport]                   ← future drop-in replacement
```

To switch from Supabase to Socket.io in the future, you only change which class is instantiated in one file (`chat.transport.ts`). **Zero changes to hooks or components.**

### Scalability Tiers

```
Active Users      What to do
────────────────────────────────────────────────────────────────
0 – 1,000         Use SupabaseChatTransport. Ship immediately.

1,000 – 10,000    Upgrade Supabase plan. Add Redis-backed cache
                  for conversation list. Message pagination is
                  critical at this stage.

10,000 – 100,000  Replace SupabaseChatTransport with AblyTransport
                  or SocketIOTransport. Add read replicas.
                  Use CDN/object storage for file attachments.

100,000+          Dedicated chat microservice. Kafka for delivery
                  guarantees. Separate time-series DB for messages.
```

---

## Step 1 — Database Migration

Create file: `supabase/migrations/20260220000000_add_chat_tables.sql`

```sql
-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL CHECK (type IN ('dm', 'group')),
  name            text,                          -- null for DMs
  description     text,
  avatar_url      text,
  org_id          uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES auth.users(id),
  last_message_at timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at       timestamptz DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES auth.users(id),
  content         text NOT NULL,
  content_type    text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'system')),
  is_edited       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz,
  deleted_at      timestamptz                    -- soft delete; null = active
);

-- ─────────────────────────────────────────────
-- INDEXES (critical for query performance at scale)
-- ─────────────────────────────────────────────

CREATE INDEX idx_conv_members_user_id   ON public.conversation_members(user_id);
CREATE INDEX idx_conv_members_conv_id   ON public.conversation_members(conversation_id);
CREATE INDEX idx_chat_messages_conv_id  ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created  ON public.chat_messages(created_at DESC);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC);
CREATE INDEX idx_chat_messages_deleted  ON public.chat_messages(deleted_at) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- TRIGGER: auto-update last_message_at
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE public.conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages        ENABLE ROW LEVEL SECURITY;

-- conversations: only members can see
CREATE POLICY "Members can view their conversations"
  ON public.conversations FOR SELECT
  USING (id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- conversation_members: members of a conversation can see each other
CREATE POLICY "Members can view conversation members"
  ON public.conversation_members FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can be added to conversations"
  ON public.conversation_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- chat_messages: only members of the conversation
CREATE POLICY "Members can view messages"
  ON public.chat_messages FOR SELECT
  USING (
    deleted_at IS NULL AND
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Senders can soft-delete their own messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- ─────────────────────────────────────────────
-- ENABLE REALTIME
-- ─────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
```

---

## Step 2 — Transport Abstraction Layer

### 2a. Define the Interface

Create `src/features/chat/transport/IChatTransport.ts`:

```typescript
import type { ChatMessage, Conversation } from '../types';

/**
 * IChatTransport
 *
 * This interface abstracts the real-time delivery mechanism.
 * Current implementation: Supabase Realtime (WebSocket via Phoenix Channels).
 * Future implementations: Socket.io, Ably, Pusher — swap with zero UI changes.
 *
 * How Supabase Realtime works under the hood:
 *   1. A persistent WebSocket connection is opened to the Supabase Realtime server.
 *   2. PostgreSQL writes every INSERT/UPDATE/DELETE to its Write-Ahead Log (WAL).
 *   3. Supabase reads the WAL via logical replication.
 *   4. It checks RLS policies, then broadcasts matching rows to subscribed WebSocket clients.
 *   5. Your browser receives the row as a JSON payload — no polling, no HTTP round-trips.
 *
 * To swap the transport in the future:
 *   - Create a new class implementing this interface (e.g., SocketIOTransport).
 *   - Change the one line in chat.transport.ts that instantiates the transport.
 *   - All hooks and components remain untouched.
 */
export interface IChatTransport {
  /**
   * Subscribe to new messages in a conversation.
   * Called once when a conversation is opened.
   * @returns cleanup function — call it when the conversation closes.
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (msg: ChatMessage) => void
  ): () => void;

  /**
   * Subscribe to conversation list changes (new DMs, new groups,
   * last message updates).
   * @returns cleanup function.
   */
  subscribeToConversationUpdates(onUpdate: () => void): () => void;

  /**
   * Broadcast a typing indicator (ephemeral — not stored in DB).
   * Uses Supabase Broadcast channel; replace with socket.emit() for Socket.io.
   */
  broadcastTyping(conversationId: string, userId: string): void;

  /**
   * Subscribe to typing indicators in a conversation.
   * @returns cleanup function.
   */
  subscribeToTyping(
    conversationId: string,
    onTyping: (userId: string) => void
  ): () => void;
}
```

### 2b. Supabase Implementation

Create `src/features/chat/transport/SupabaseChatTransport.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { IChatTransport } from './IChatTransport';
import type { ChatMessage } from '../types';
import { mapDbMessageToChatMessage } from '../chat.mappers';

export class SupabaseChatTransport implements IChatTransport {
  subscribeToMessages(
    conversationId: string,
    onMessage: (msg: ChatMessage) => void
  ): () => void {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender profile separately (avoids FK join issues)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, email, avatar_url, initials')
            .eq('id', payload.new.sender_id)
            .single();

          const msg = mapDbMessageToChatMessage(payload.new, profile);
          onMessage(msg);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  subscribeToConversationUpdates(onUpdate: () => void): () => void {
    const channel = supabase
      .channel('conversation-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, onUpdate)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members' }, onUpdate)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  broadcastTyping(conversationId: string, userId: string): void {
    // Ephemeral broadcast — never written to DB
    supabase.channel(`typing:${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    });
  }

  subscribeToTyping(
    conversationId: string,
    onTyping: (userId: string) => void
  ): () => void {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        onTyping(payload.payload.userId);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}
```

### 2c. Transport Factory (the one line you change to swap providers)

Create `src/features/chat/transport/index.ts`:

```typescript
import { SupabaseChatTransport } from './SupabaseChatTransport';
import type { IChatTransport } from './IChatTransport';

/**
 * TRANSPORT SWAP POINT
 *
 * To switch to Socket.io:
 *   import { SocketIOTransport } from './SocketIOTransport';
 *   export const chatTransport: IChatTransport = new SocketIOTransport();
 *
 * To switch to Ably:
 *   import { AblyTransport } from './AblyTransport';
 *   export const chatTransport: IChatTransport = new AblyTransport();
 *
 * Zero changes needed anywhere else in the codebase.
 */
export const chatTransport: IChatTransport = new SupabaseChatTransport();
```

---

## Step 3 — Mappers

Create `src/features/chat/chat.mappers.ts`:

```typescript
import type { Conversation, ChatMessage, ConversationMember } from './types';

export function mapDbMessageToChatMessage(row: any, senderProfile: any): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: senderProfile?.name ?? 'Unknown',
    senderAvatar: senderProfile?.avatar_url ?? undefined,
    senderInitials: senderProfile?.initials ?? '??',
    contentType: row.content_type,
    content: row.content,
    attachments: [],  // extend later with attachments table join
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    isEdited: row.is_edited ?? false,
  };
}

export function mapDbMemberToConversationMember(
  row: any,
  profile: any
): ConversationMember {
  return {
    id: row.user_id,
    name: profile?.name ?? 'Unknown',
    email: profile?.email ?? '',
    avatarUrl: profile?.avatar_url ?? undefined,
    initials: profile?.initials ?? '??',
    role: row.role,
    isOnline: false,  // extend later with presence channel
  };
}

export function mapDbConversation(
  conv: any,
  members: ConversationMember[],
  lastMessage?: { content: string; senderName: string; createdAt: string }
): Conversation {
  return {
    id: conv.id,
    type: conv.type,
    name: conv.name ?? members.find((m) => m.id !== conv.currentUserId)?.name ?? 'Unknown',
    description: conv.description ?? undefined,
    avatarUrl: conv.avatar_url ?? undefined,
    members,
    lastMessage,
    lastMessageAt: conv.last_message_at,
    createdAt: conv.created_at,
  };
}
```

---

## Step 4 — Chat Service

Create `src/services/chat.service.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Conversation, ChatMessage, ReachableUser } from '@/features/chat/types';
import {
  mapDbMessageToChatMessage,
  mapDbMemberToConversationMember,
  mapDbConversation,
} from '@/features/chat/chat.mappers';
import { chatTransport } from '@/features/chat/transport';

/**
 * Chat Service
 *
 * Handles all data operations (CRUD) against Supabase.
 * Real-time subscriptions are delegated to chatTransport (IChatTransport).
 *
 * IMPORTANT: Always use separate queries joined client-side.
 * Do NOT use Supabase FK hint joins (e.g., profiles!inner) because
 * the schema cache may be stale and cause 400 errors.
 */
export const chatService = {

  // ─── Conversations ────────────────────────────────────────────────────────

  async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Get conversation IDs the current user belongs to
    const { data: memberRows, error: memberErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, role')
      .eq('user_id', user.id);

    if (memberErr || !memberRows?.length) return [];
    const convIds = memberRows.map((r) => r.conversation_id);

    // 2. Fetch conversation metadata
    const { data: convRows } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });

    if (!convRows?.length) return [];

    // 3. Fetch all members for all conversations
    const { data: allMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, role')
      .in('conversation_id', convIds);

    // 4. Fetch profiles for all member user IDs
    const allUserIds = [...new Set((allMembers || []).map((m) => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials')
      .in('id', allUserIds);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    // 5. Fetch last message for each conversation
    const lastMessagePromises = convIds.map((id) =>
      supabase
        .from('chat_messages')
        .select('content, sender_id, created_at')
        .eq('conversation_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    const lastMessageResults = await Promise.all(lastMessagePromises);

    // 6. Assemble
    return convRows.map((conv, i) => {
      const members = (allMembers || [])
        .filter((m) => m.conversation_id === conv.id)
        .map((m) => mapDbMemberToConversationMember(m, profileMap[m.user_id]));

      const lastMsgRow = lastMessageResults[i]?.data;
      const lastMessage = lastMsgRow
        ? {
            content: lastMsgRow.content,
            senderName: profileMap[lastMsgRow.sender_id]?.name ?? 'Unknown',
            createdAt: lastMsgRow.created_at,
          }
        : undefined;

      return mapDbConversation({ ...conv, currentUserId: user.id }, members, lastMessage);
    });
  },

  // ─── Messages ─────────────────────────────────────────────────────────────

  /**
   * Paginated message fetch — ALWAYS paginate, never fetch all messages.
   * Default: last 50 messages. Pass `before` cursor for older messages (infinite scroll up).
   */
  async getMessages(
    conversationId: string,
    options: { before?: string; limit?: number } = {}
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    const limit = options.limit ?? 50;

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // fetch one extra to check hasMore

    if (options.before) {
      query = query.lt('created_at', options.before);
    }

    const { data, error } = await query;
    if (error) throw error;

    const hasMore = (data?.length ?? 0) > limit;
    const rows = (data ?? []).slice(0, limit).reverse(); // oldest → newest

    if (!rows.length) return { messages: [], hasMore: false };

    // Fetch sender profiles separately
    const senderIds = [...new Set(rows.map((r) => r.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials')
      .in('id', senderIds);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    return {
      messages: rows.map((row) => mapDbMessageToChatMessage(row, profileMap[row.sender_id])),
      hasMore,
    };
  },

  async sendMessage(
    conversationId: string,
    content: string,
    contentType: 'text' | 'system' = 'text'
  ): Promise<ChatMessage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content, content_type: contentType })
      .select()
      .single();

    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials')
      .eq('id', user.id)
      .single();

    return mapDbMessageToChatMessage(data, profile);
  },

  // ─── DMs & Groups ─────────────────────────────────────────────────────────

  async getOrCreateDM(otherUserId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Find conversations where both users are members and type = dm
    const { data: myConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    const { data: theirConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherUserId);

    const myIds = new Set((myConvs || []).map((r) => r.conversation_id));
    const sharedIds = (theirConvs || [])
      .map((r) => r.conversation_id)
      .filter((id) => myIds.has(id));

    if (sharedIds.length) {
      const { data: dmConv } = await supabase
        .from('conversations')
        .select('id')
        .in('id', sharedIds)
        .eq('type', 'dm')
        .maybeSingle();

      if (dmConv) return dmConv.id;
    }

    // Create new DM conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ type: 'dm', created_by: user.id })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('conversation_members').insert([
      { conversation_id: newConv.id, user_id: user.id, role: 'owner' },
      { conversation_id: newConv.id, user_id: otherUserId, role: 'member' },
    ]);

    return newConv.id;
  },

  async createGroup(
    name: string,
    description: string,
    memberIds: string[]
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ type: 'group', name, description, created_by: user.id })
      .select()
      .single();

    if (error) throw error;

    const members = [
      { conversation_id: newConv.id, user_id: user.id, role: 'owner' },
      ...memberIds.map((id) => ({ conversation_id: newConv.id, user_id: id, role: 'member' })),
    ];

    await supabase.from('conversation_members').insert(members);

    return newConv.id;
  },

  // ─── Users ────────────────────────────────────────────────────────────────

  async getReachableUsers(): Promise<ReachableUser[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get org IDs the current user belongs to
    const { data: myOrgs } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id);

    if (!myOrgs?.length) return [];
    const orgIds = myOrgs.map((r) => r.org_id);

    // Get all members in those orgs (excluding self)
    const { data: orgMembers } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .in('org_id', orgIds)
      .neq('user_id', user.id);

    if (!orgMembers?.length) return [];
    const userIds = [...new Set(orgMembers.map((m) => m.user_id))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials')
      .in('id', userIds);

    const roleMap = Object.fromEntries(orgMembers.map((m) => [m.user_id, m.role]));

    return (profiles || []).map((p) => ({
      id: p.id,
      name: p.name ?? 'Unknown',
      email: p.email ?? '',
      avatarUrl: p.avatar_url ?? undefined,
      initials: p.initials ?? '??',
      role: roleMap[p.id] ?? 'member',
      isOnline: false,  // extend with Supabase Presence later
    }));
  },

  // ─── Real-time (delegated to transport) ───────────────────────────────────

  subscribeToMessages: chatTransport.subscribeToMessages.bind(chatTransport),
  subscribeToConversationUpdates: chatTransport.subscribeToConversationUpdates.bind(chatTransport),
  broadcastTyping: chatTransport.broadcastTyping.bind(chatTransport),
  subscribeToTyping: chatTransport.subscribeToTyping.bind(chatTransport),
};
```

---

## Step 5 — Custom Hooks

Create `src/features/chat/hooks/useChatData.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chat.service';
import type { Conversation, ChatMessage } from '../types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatService.getConversations();
      setConversations(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    // Subscribe to real-time updates — refetch when conversation list changes
    const unsubscribe = chatService.subscribeToConversationUpdates(fetch);
    return unsubscribe;
  }, [fetch]);

  return { conversations, loading, error, refetch: fetch };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const oldestCursor = useRef<string | undefined>(undefined);

  const fetchInitial = useCallback(async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const result = await chatService.getMessages(conversationId);
      setMessages(result.messages);
      setHasMore(result.hasMore);
      oldestCursor.current = result.messages[0]?.createdAt;
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load older messages (infinite scroll upward)
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || !oldestCursor.current) return;
    try {
      const result = await chatService.getMessages(conversationId, { before: oldestCursor.current });
      setMessages((prev) => [...result.messages, ...prev]);
      setHasMore(result.hasMore);
      oldestCursor.current = result.messages[0]?.createdAt;
    } catch (e: any) {
      setError(e.message);
    }
  }, [conversationId, hasMore]);

  useEffect(() => {
    setMessages([]);
    fetchInitial();
  }, [fetchInitial]);

  useEffect(() => {
    if (!conversationId) return;
    // Subscribe to real-time new messages
    const unsubscribe = chatService.subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        // Deduplicate in case the sender also receives via realtime
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return unsubscribe;
  }, [conversationId]);

  return { messages, loading, error, hasMore, loadMore };
}
```

---

## Step 6 — Update Existing Components

### `Chat.tsx`
```
- Remove: import { mockConversations, mockMessages } from './mockData'
- Add: import { useConversations, useMessages } from './hooks/useChatData'
- Use useConversations() to get live conversations array
- Use useMessages(activeConversationId) to get live messages
- Pass conversations and messages as props down
- Show spinner while loading
```

### `ConversationList.tsx`
```
- Remove: import { mockConversations } from '../mockData'
- Accept prop: conversations: Conversation[]
- Accept prop: loading: boolean
- Show skeleton rows while loading === true
```

### `MessageArea.tsx`
```
- Remove: direct reading of mock data
- Accept prop: messages: ChatMessage[]
- Accept prop: hasMore: boolean
- Accept prop: onLoadMore: () => void
- Add scroll listener at top of message list to trigger onLoadMore
```

### `MessageInput.tsx`
```
- Remove: toast.success('Message sent (mock)')
- Add: isSending state (boolean)
- Replace handleSend with:
    const handleSend = async () => {
      if (!value.trim() || isSending) return;
      const draft = value;
      setDraft(conversationId, '');  // optimistic clear
      setIsSending(true);
      try {
        await chatService.sendMessage(conversationId, draft);
      } catch {
        setDraft(conversationId, draft);  // restore on failure
        toast.error('Failed to send message');
      } finally {
        setIsSending(false);
      }
    };
- Disable textarea and send button while isSending === true
```

### `NewDMDialog.tsx`
```
- Remove: import { mockReachableUsers, mockConversations } from '../mockData'
- On dialog open (useEffect on `open` prop): call chatService.getReachableUsers()
- Show loading state while fetching
- On user select: const convId = await chatService.getOrCreateDM(userId); onSelect(convId);
```

### `NewGroupDialog.tsx`
```
- Remove: import { mockReachableUsers } from '../mockData'
- On dialog open: call chatService.getReachableUsers()
- On create: const convId = await chatService.createGroup(name, description, [...selectedIds]); navigate to /chat/:convId
```

### `useChatStore.ts`
```
- Change: unreadCounts: { 'conv-1': 2, 'conv-2': 1, 'conv-4': 3 }
- To:     unreadCounts: {}
```

---

## Step 7 — Do NOT Touch

- `src/features/chat/types.ts` — do not modify any type definitions
- `src/features/chat/mockData.ts` — leave in place, just stop importing it from any component

---

## Future Transport Swap Guide

When you outgrow Supabase Realtime (>10,000 concurrent users), follow these steps:

### Option A: Switch to Ably
```typescript
// src/features/chat/transport/AblyTransport.ts
import Ably from 'ably';
import type { IChatTransport } from './IChatTransport';

export class AblyTransport implements IChatTransport {
  private client = new Ably.Realtime({ key: import.meta.env.VITE_ABLY_KEY });

  subscribeToMessages(conversationId, onMessage) {
    const channel = this.client.channels.get(`messages:${conversationId}`);
    channel.subscribe('INSERT', (msg) => onMessage(msg.data));
    return () => channel.unsubscribe();
  }
  // ... implement rest of interface
}
```

Then in `src/features/chat/transport/index.ts`:
```typescript
// Just change this one line:
export const chatTransport: IChatTransport = new AblyTransport();
```

### Option B: Switch to Socket.io
```typescript
// src/features/chat/transport/SocketIOTransport.ts
import { io, Socket } from 'socket.io-client';
import type { IChatTransport } from './IChatTransport';

export class SocketIOTransport implements IChatTransport {
  private socket: Socket = io(import.meta.env.VITE_SOCKET_URL);

  subscribeToMessages(conversationId, onMessage) {
    this.socket.emit('join', conversationId);
    this.socket.on(`message:${conversationId}`, onMessage);
    return () => {
      this.socket.off(`message:${conversationId}`, onMessage);
      this.socket.emit('leave', conversationId);
    };
  }
  // ... implement rest of interface
}
```

---

## Coding Rules — Must Follow

1. **No FK hint joins** in Supabase queries. Always do separate queries and join in JavaScript. FK hint joins (e.g., `profiles!inner`) fail when the schema cache is stale.
2. **Always paginate messages** — never fetch all messages for a conversation. Default limit: 50. Use `before` cursor for older messages.
3. **Typing indicators** — never write to the database. Use `chatTransport.broadcastTyping()` (ephemeral Supabase Broadcast / socket.emit).
4. **Always clean up Realtime subscriptions** — call the returned cleanup function in `useEffect` return.
5. **Deduplicate messages** — the sender may receive their own message both from the `sendMessage` response and the Realtime subscription. Always check `id` before appending.
6. **Error handling** — all async errors must be caught and shown via `toast.error(...)` from `sonner`. Never swallow errors silently.
7. **Draft restoration** — if `sendMessage` throws, restore the draft text so the user doesn't lose their message.
8. **All Supabase calls stay in `chat.service.ts`** — hooks and components must never import `supabase` directly.
```
