

# Chat Feature — Full Backend Integration

## What This Does

Replaces the mock chat system with a fully dynamic, real-time, production-ready implementation backed by Lovable Cloud. Messages persist in the database, conversations update in real-time, and the transport layer is abstracted so it can be swapped in the future without touching any UI code.

## Architecture

```text
UI Components (unchanged)
     |
Custom Hooks (useChatData.ts) -- new
     |
Chat Service (chat.service.ts) -- new
     |
Transport Interface (IChatTransport) -- new
     |
SupabaseChatTransport -- current implementation
```

Components never import the database client directly. All data goes through `chat.service.ts`, and all real-time subscriptions go through the transport interface. To switch providers later, you change one line in one file.

## Step 1 — Database Tables

Create three new tables:

- **conversations** — stores conversation metadata (type, name, description)
- **conversation_members** — links users to conversations with roles (owner/admin/member)
- **chat_messages** — stores all messages with soft-delete support

Plus: indexes for performance, a trigger to auto-update `last_message_at` on new messages, Row Level Security policies so users can only see conversations they belong to, and real-time enabled on all three tables.

Key correction from the planning document: the `organization_members` table uses `organization_id` (not `org_id`), so the reachable users query will use the correct column name.

## Step 2 — Transport Abstraction Layer (3 files)

- **IChatTransport.ts** — TypeScript interface defining `subscribeToMessages`, `subscribeToConversationUpdates`, `broadcastTyping`, `subscribeToTyping`
- **SupabaseChatTransport.ts** — implements the interface using Realtime channels and Broadcast for typing indicators
- **transport/index.ts** — exports a single instance; change one line here to swap providers

## Step 3 — Data Mappers (1 file)

**chat.mappers.ts** — pure functions that convert database rows into the existing TypeScript types (`ChatMessage`, `Conversation`, `ConversationMember`). No type changes needed.

## Step 4 — Chat Service (1 file)

**chat.service.ts** — all database operations:
- `getConversations()` — fetches user's conversations with members and last message
- `getMessages(conversationId, { before, limit })` — paginated message fetch (default 50)
- `sendMessage(conversationId, content)` — inserts a message
- `getOrCreateDM(otherUserId)` — finds existing DM or creates new one
- `createGroup(name, description, memberIds)` — creates group conversation
- `getReachableUsers()` — fetches org members for "New DM" dialog

All queries use separate fetches joined client-side (no FK hint joins which can fail with stale schema cache).

## Step 5 — Custom Hooks (1 file)

**useChatData.ts** with two hooks:
- `useConversations()` — fetches conversation list + subscribes to real-time updates
- `useMessages(conversationId)` — fetches paginated messages + subscribes to new messages + supports `loadMore` for infinite scroll

## Step 6 — Update Existing Components

| Component | Change |
|---|---|
| **Chat.tsx** | Replace `mockConversations`/`mockMessages` with `useConversations()` and `useMessages()` hooks. Show loading spinner. |
| **ConversationList.tsx** | Accept `conversations` and `loading` as props instead of importing mock data. Show skeleton rows while loading. |
| **MessageArea.tsx** | Accept `hasMore` and `onLoadMore` props. Add scroll-to-top detection for infinite scroll. |
| **MessageInput.tsx** | Replace toast mock with real `chatService.sendMessage()`. Add `isSending` state. Restore draft on failure. |
| **NewDMDialog.tsx** | Fetch real users via `chatService.getReachableUsers()`. Use `chatService.getOrCreateDM()` on select. |
| **NewGroupDialog.tsx** | Fetch real users. Use `chatService.createGroup()` on create. Navigate to new conversation. |
| **useChatStore.ts** | Clear hardcoded `unreadCounts` to empty object `{}`. |

## Step 7 — Files NOT Modified

- `types.ts` — all existing types remain unchanged
- `mockData.ts` — left in place but no longer imported by any component
- All small UI components (MessageBubble, ConversationItem, etc.) — unchanged

## Files Summary

| Action | File |
|---|---|
| DB Migration | 3 tables, indexes, trigger, RLS, realtime |
| Create | `src/features/chat/transport/IChatTransport.ts` |
| Create | `src/features/chat/transport/SupabaseChatTransport.ts` |
| Create | `src/features/chat/transport/index.ts` |
| Create | `src/features/chat/chat.mappers.ts` |
| Create | `src/services/chat.service.ts` |
| Create | `src/features/chat/hooks/useChatData.ts` |
| Modify | `src/features/chat/Chat.tsx` |
| Modify | `src/features/chat/components/ConversationList.tsx` |
| Modify | `src/features/chat/components/MessageArea.tsx` |
| Modify | `src/features/chat/components/MessageInput.tsx` |
| Modify | `src/features/chat/components/NewDMDialog.tsx` |
| Modify | `src/features/chat/components/NewGroupDialog.tsx` |
| Modify | `src/features/chat/stores/useChatStore.ts` |

Total: 6 new files, 7 modified files, 1 database migration.

