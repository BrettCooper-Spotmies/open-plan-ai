

# Chat Feature Enhancements — 7 Fixes and Features

## Overview

This plan addresses all 7 requested modifications to the chat system. Here's a summary of each:

| # | Feature | What Changes |
|---|---------|-------------|
| 1 | File attachments | New storage bucket, DB table, upload UI in MessageInput, display in MessageBubble |
| 2 | Shimmer loading for conversations | Replace Loader2 spinner with animated shimmer skeletons in message area |
| 3 | Unread count badge (new messages) | Real-time unread tracking via realtime subscription + badge display |
| 4 | Typing indicator | Wire up existing broadcast transport to show "X is typing..." |
| 5 | Send button loader | Show spinner on send button while message is being sent |
| 6 | Conversation search fix | Fix the search to filter by member names (for DMs) not just conversation name |
| 7 | Online/offline + last seen | Use Supabase Presence for online status, add `last_seen_at` column to profiles |

---

## 1. File Attachments

### Database Changes
- Create a `chat-attachments` storage bucket (public)
- Add RLS policies so conversation members can upload/read files

### Code Changes

**MessageInput.tsx**
- Add a hidden file input triggered by the existing Paperclip button
- On file select: upload to `chat-attachments/{conversationId}/{uuid}-{filename}` via Supabase Storage
- Include the public URL in the message content as a special format, or store attachment metadata in `chat_messages.content` as JSON when `content_type = 'file'`
- Add `content_type: 'file'` support to the chat_messages table (already a text column, just use new value)

**MessageBubble.tsx**
- Detect `content_type === 'file'` messages
- Render image preview for image types, or a file card with download link for other types
- Parse content as JSON `{ fileName, fileSize, mimeType, url, text? }`

**chat.service.ts**
- Add `sendFileMessage(conversationId, file)` method that uploads to storage and inserts a message

**types.ts**
- `MessageContentType` already has 'text' | 'system'; add 'file' as a union member

## 2. Shimmer Loading in Chat Conversation

### Code Changes

**Chat.tsx** (message loading state)
- Replace the `Loader2` spinner with a `MessageAreaSkeleton` component

**New: MessageAreaSkeleton.tsx**
- Renders 6-8 shimmer message bubbles (alternating left/right) using the existing `Skeleton` component
- Mimics the look of real messages with varying widths

## 3. Unread Count Badge

### Code Changes

**useChatData.ts** — `useConversations` hook
- When a new message arrives via realtime and the conversation is NOT the active one, increment `unreadCounts[convId]` in the chat store

**useChatStore.ts**
- Add `incrementUnread(conversationId: string)` action

**ConversationItem.tsx**
- Already shows `UnreadBadge` with `unreadCount` prop — this will work once the store is populated

The existing `setActiveConversation` already resets unread to 0 when opening a conversation.

## 4. Typing Indicator

### Code Changes

**MessageInput.tsx**
- On text change, call `chatTransport.broadcastTyping(conversationId, userId)` with debounce (every 2 seconds max)

**New: useTypingIndicator.ts** hook
- Subscribe to `chatTransport.subscribeToTyping(conversationId, ...)`
- Track which users are typing with a 3-second timeout
- Return `typingUsers: string[]` (user names)
- Look up names from conversation members

**Chat.tsx**
- Use `useTypingIndicator(activeId, activeConv?.members)` 
- Pass typing info to a `TypingIndicator` component rendered between MessageArea and MessageInput

**TypingIndicator.tsx** (already exists)
- Update to accept and display user names: "Sudhir is typing..." or "2 people are typing..."

## 5. Send Button Loader

### Code Changes

**MessageInput.tsx**
- Already has `isSending` state
- Replace `Send` icon with `Loader2 animate-spin` when `isSending` is true
- The button is already disabled during sending

## 6. Fix Conversation Search

### Root Cause
The search filters by `c.name.toLowerCase().includes(q)`. For DMs, `conversation.name` is set by `mapConversation` to the other member's name — but only if `currentUserId` was passed correctly. The search itself works on `.name`, which should be correct now after the previous fix.

### Code Changes

**ConversationList.tsx**
- Update the search filter to also search through member names and emails:
```
list = list.filter((c) => 
  c.name.toLowerCase().includes(q) ||
  c.members.some(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
);
```

## 7. Online/Offline + Last Seen

### Database Changes
- Add `last_seen_at` column to `profiles` table (timestamp with time zone, nullable)

### Code Changes

**New: usePresence.ts** hook
- Use Supabase Realtime Presence to track online users
- On mount: track current user's presence in a global `online-users` channel
- Update `profiles.last_seen_at` periodically (every 60s) and on window `beforeunload`
- Return a `Set<string>` of online user IDs

**Chat.tsx**
- Use `usePresence()` to get the set of online user IDs
- Pass `onlineUserIds` down to `ConversationList` and `ChatHeader`

**ConversationItem.tsx & ChatHeader.tsx**
- Check if the other member's ID is in `onlineUserIds` to show green/gray dot
- If offline, show "Last seen X ago" using the `last_seen_at` from profiles

**chat.service.ts** — `getConversations`
- Include `last_seen_at` in the profiles query so it's available on `ConversationMember`

**types.ts**
- Add `lastSeenAt?: string` to `ConversationMember`

---

## Technical Details — Files Changed

| File | Changes |
|---|---|
| `supabase/migrations/...` | Create `chat-attachments` bucket + RLS; add `last_seen_at` to profiles |
| `src/features/chat/types.ts` | Add 'file' to `MessageContentType`, `lastSeenAt` to `ConversationMember` |
| `src/features/chat/chat.mappers.ts` | Map `last_seen_at` to members |
| `src/features/chat/stores/useChatStore.ts` | Add `incrementUnread` action |
| `src/features/chat/hooks/useChatData.ts` | Increment unread on realtime messages for inactive conversations |
| `src/features/chat/hooks/useTypingIndicator.ts` | **New** — typing subscription hook |
| `src/features/chat/hooks/usePresence.ts` | **New** — online presence tracking |
| `src/features/chat/components/MessageInput.tsx` | File upload, typing broadcast, send loader |
| `src/features/chat/components/MessageBubble.tsx` | File/image attachment rendering |
| `src/features/chat/components/MessageAreaSkeleton.tsx` | **New** — shimmer skeleton for messages |
| `src/features/chat/components/TypingIndicator.tsx` | Update to show user names |
| `src/features/chat/components/ConversationList.tsx` | Fix search to include member names |
| `src/features/chat/components/ConversationItem.tsx` | Online status + last seen display |
| `src/features/chat/components/ChatHeader.tsx` | Online status + last seen + typing status |
| `src/features/chat/Chat.tsx` | Wire up presence, typing, shimmer skeleton |
| `src/services/chat.service.ts` | Add `sendFileMessage`, include `last_seen_at` in queries |
| `src/features/chat/transport/IChatTransport.ts` | Add presence methods to interface |
| `src/features/chat/transport/SupabaseChatTransport.ts` | Implement presence tracking |

