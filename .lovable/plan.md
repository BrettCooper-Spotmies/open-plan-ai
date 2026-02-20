

# Fix Chat Issues: Attachments, Edit/Delete, Last Seen, and In-Conversation Search

## Issue 1: Attachment Error (content_type constraint)

The database has a CHECK constraint that only allows `'text'` and `'system'` for `content_type`. The code sends `'file'` which violates it.

**Fix:** Run a migration to update the constraint to include `'file'`.

```sql
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_content_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_content_type_check 
  CHECK (content_type = ANY (ARRAY['text', 'system', 'file']));
```

## Issue 2: Edit and Delete Messages (24-hour window)

Add edit and delete functionality with these rules:
- Only the sender can edit/delete their own messages
- Only messages less than 24 hours old can be edited/deleted
- Deleted messages show "This message was deleted by [sender name]" instead of being removed
- Edited messages show an "(edited)" indicator

### Database Changes
- The `chat_messages` table already has `updated_at`, `deleted_at` columns and UPDATE/DELETE RLS policies
- Add a `deleted_by_name` column (text, nullable) to store the deleter's display name for the "deleted by X" text

### Code Changes

| File | Change |
|---|---|
| `src/features/chat/types.ts` | Add `deletedAt?: string` and `deletedByName?: string` to `ChatMessage` |
| `src/features/chat/chat.mappers.ts` | Map `deleted_at` and `deleted_by_name` fields |
| `src/services/chat.service.ts` | Add `editMessage(id, content)` and `deleteMessage(id, senderName)` methods; update `getMessages` to include soft-deleted messages (remove the `is(deleted_at, null)` filter so deleted messages still appear with the "deleted by" text) |
| `src/features/chat/components/MessageBubble.tsx` | Add edit/delete button handlers with 24hr check; show "This message was deleted by X" for deleted messages; show inline edit textarea |
| `src/features/chat/components/MessageArea.tsx` | Pass `onEditMessage` and `onDeleteMessage` callbacks |
| `src/features/chat/Chat.tsx` | Create edit/delete handler functions that call the service and trigger refetch |

### Edit Flow
1. User clicks pencil icon on their message (< 24hrs old)
2. Message content becomes an editable textarea
3. User presses Enter or clicks Save
4. `chatService.editMessage(id, newContent)` updates the DB (`content` + `updated_at`)
5. `isEdited` flag becomes true, "(edited)" label appears

### Delete Flow
1. User clicks trash icon on their message (< 24hrs old)
2. Confirmation dialog appears
3. `chatService.deleteMessage(id, senderName)` sets `deleted_at = now()` and `deleted_by_name = senderName`
4. Message renders as: "This message was deleted by Sekhar javvadi" in italic/muted style

## Issue 3: Last Seen Verification

After reviewing the code, last seen is **correctly implemented** and NOT hardcoded:
- `usePresence` hook tracks online users via Supabase Presence channel
- `last_seen_at` is updated every 60 seconds and on `beforeunload`
- `ChatHeader` displays "Online" or "Last seen X ago" using real data from `formatDistanceToNowStrict`
- `chat.mappers.ts` maps `last_seen_at` from profiles

No changes needed for this item.

## Issue 4: In-Conversation Search (Search icon in ChatHeader)

The Search button in `ChatHeader` (line 71) has no `onClick` handler. It needs to open a search bar within the message area to search through messages in the active conversation.

### Implementation

| File | Change |
|---|---|
| `src/features/chat/stores/useChatStore.ts` | Add `isMessageSearchOpen` and `messageSearchQuery` state + toggle/set actions |
| `src/features/chat/components/ChatHeader.tsx` | Wire Search button to toggle `isMessageSearchOpen` in the store |
| `src/features/chat/components/MessageSearchBar.tsx` | **New** - Search input bar that appears below the header with input field and close button |
| `src/features/chat/components/MessageArea.tsx` | Filter/highlight messages matching the search query |
| `src/features/chat/Chat.tsx` | Render `MessageSearchBar` between ChatHeader and MessageArea when search is open |

The search will filter messages client-side (since messages are already loaded) and highlight matching text in message bubbles.

---

## Summary of All Files Changed

| File | Changes |
|---|---|
| Migration SQL | Update content_type constraint; add `deleted_by_name` column |
| `src/features/chat/types.ts` | Add `deletedAt`, `deletedByName` fields |
| `src/features/chat/chat.mappers.ts` | Map new fields |
| `src/services/chat.service.ts` | Add `editMessage`, `deleteMessage`; adjust message query for deleted messages |
| `src/features/chat/stores/useChatStore.ts` | Add message search state |
| `src/features/chat/components/MessageBubble.tsx` | Edit/delete UI + deleted message display |
| `src/features/chat/components/MessageArea.tsx` | Pass handlers, search filtering |
| `src/features/chat/components/ChatHeader.tsx` | Wire search button |
| `src/features/chat/components/MessageSearchBar.tsx` | **New** - search input component |
| `src/features/chat/Chat.tsx` | Wire edit/delete handlers, render search bar |

