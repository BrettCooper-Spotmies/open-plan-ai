
# Fix: Chat Conversations Not Appearing After Creation

## Root Cause

The backend is working perfectly — conversations and members are created successfully (201 responses). The bug is purely on the frontend:

1. User clicks a person in the "New Message" dialog
2. `getOrCreateDM()` succeeds and returns the new conversation ID
3. `onSelect(convId)` is called, which navigates to `/chat/{convId}`
4. But the conversation list is never refreshed
5. `activeConv = conversations.find(c => c.id === activeId)` returns `undefined` because the new conversation isn't in the stale list
6. The UI shows the "Select a conversation" empty state instead of the message area

## Solution

Pass the `refetch` function from `useConversations()` down to `ConversationList`, then into `NewDMDialog` and `NewGroupDialog`. After successfully creating a DM or group, call `refetch()` before navigating.

## Changes

### 1. Chat.tsx
- Pass `refetch` as a prop to `ConversationList`

### 2. ConversationList.tsx
- Accept `onConversationCreated` prop (which is `refetch`)
- Pass it to both `NewDMDialog` and `NewGroupDialog`

### 3. NewDMDialog.tsx
- Accept `onConversationCreated` callback prop
- Call it after `getOrCreateDM()` succeeds, before calling `onSelect`

### 4. NewGroupDialog.tsx
- Accept `onConversationCreated` callback prop
- Call it after `createGroup()` succeeds, before calling `onSelect`

## Technical Details

```text
Chat.tsx
  passes refetch -> ConversationList (as onConversationCreated)
    passes onConversationCreated -> NewDMDialog
    passes onConversationCreated -> NewGroupDialog

Flow after fix:
  User clicks person -> getOrCreateDM() -> await refetch() -> onSelect(id) -> navigate
  Result: conversations list is populated, activeConv is found, message area renders
```

### Files Modified

| File | Change |
|---|---|
| `src/features/chat/Chat.tsx` | Pass `refetch` to `ConversationList` as `onConversationCreated` |
| `src/features/chat/components/ConversationList.tsx` | Accept and forward `onConversationCreated` to dialogs |
| `src/features/chat/components/NewDMDialog.tsx` | Call `onConversationCreated` after DM creation |
| `src/features/chat/components/NewGroupDialog.tsx` | Call `onConversationCreated` after group creation |

No database changes needed. No new files.
