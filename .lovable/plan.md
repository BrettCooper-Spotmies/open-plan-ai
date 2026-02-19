
# Implement Chat Feature — UI Only (No Backend)

## Overview

Build the complete chat UI with mock data, following the planning document's specifications. This creates all visual components, routing, and local state so the feature is fully interactive and ready for backend integration later.

## What Gets Built

A full 3-column chat page at `/chat` with:
- Left panel: Conversation list with search and DM/Group tabs
- Center panel: Message area with bubbles, date dividers, and input
- Right panel: Collapsible details (members, shared files)
- Sidebar navigation with "Chat" icon and unread badge
- New DM and New Group dialog flows
- Mobile-responsive layout
- Full dark/light theme support

## File Structure

```text
src/features/chat/
  index.ts                    -- Default export (lazy-loaded)
  Chat.tsx                    -- Main 3-column layout page
  types.ts                    -- Chat-specific TypeScript types
  mockData.ts                 -- Mock conversations, messages, users
  components/
    ConversationList.tsx       -- Left panel with search + tabs
    ConversationItem.tsx       -- Single conversation row
    ConversationSearch.tsx     -- Search input for filtering
    MessageArea.tsx            -- Center panel message display
    MessageBubble.tsx          -- Individual message (sender/receiver)
    MessageInput.tsx           -- Auto-expanding input with toolbar
    MessageDateDivider.tsx     -- Date separator between message groups
    SystemMessage.tsx          -- "X joined the group" messages
    ChatHeader.tsx             -- Top bar of active conversation
    DetailPanel.tsx            -- Right panel (members, files)
    NewDMDialog.tsx            -- Start a new DM dialog
    NewGroupDialog.tsx         -- Create a new group dialog
    EmptyState.tsx             -- Placeholder states (no selection, no convos)
    TypingIndicator.tsx        -- Animated "typing..." dots
    OnlineStatus.tsx           -- Green/gray dot component
    UnreadBadge.tsx            -- Red unread count badge
  stores/
    useChatStore.ts            -- Zustand store for chat UI state
```

## Detailed Component Breakdown

### 1. Types (`types.ts`)
Define all chat-specific types: `Conversation`, `ConversationMember`, `ChatMessage`, `MessageAttachment`, `ConversationType`, `MessageContentType`, `ConversationMemberRole`.

### 2. Mock Data (`mockData.ts`)
- 5 mock conversations (3 DMs, 2 groups)
- ~20 mock messages across conversations with varied timestamps
- 6 mock reachable users for the "New DM" dialog
- Realistic data matching the app's existing mock pattern

### 3. Zustand Store (`useChatStore.ts`)
Client-side state management:
- `activeConversationId` -- which conversation is open
- `conversationFilter` -- "all" / "dms" / "groups" tab
- `searchQuery` -- conversation list filter
- `isDetailPanelOpen` -- toggle right panel
- `draftMessages` -- per-conversation drafts (persisted to localStorage)
- `unreadCounts` -- mock unread counts
- `totalUnread` -- computed total for sidebar badge

### 4. Main Page (`Chat.tsx`)
3-column responsive layout:
- Uses `AppLayout` wrapper (consistent with all other pages)
- Left: `ConversationList` (280px, full-height)
- Center: `MessageArea` with `ChatHeader` + `MessageInput` (flex-1)
- Right: `DetailPanel` (280px, collapsible)
- On mobile (< 768px): Shows conversation list OR message area (not both)
- When no conversation selected: shows `EmptyState`

### 5. Conversation List (`ConversationList.tsx`)
- `ConversationSearch` at top
- "New Message" and "New Group" buttons
- Tabs: All | DMs | Groups
- Sorted by `lastMessageAt` descending
- Each item via `ConversationItem`

### 6. Conversation Item (`ConversationItem.tsx`)
- Avatar (user avatar for DM, group initials for group)
- Name (other user's name for DM, group name for group)
- Last message preview (truncated to 1 line)
- Timestamp (relative: "2m", "1h", "Yesterday")
- Unread badge (red dot with count)
- Online status dot for DMs
- Active/selected highlight

### 7. Message Area (`MessageArea.tsx`)
- Scrollable message list using `ScrollArea`
- Messages grouped by sender (consecutive messages within 2 min)
- `MessageDateDivider` between different days
- `SystemMessage` for join/leave events
- Auto-scroll to bottom on new messages
- Empty state when conversation has no messages

### 8. Message Bubble (`MessageBubble.tsx`)
- Right-aligned (primary color bg) for current user
- Left-aligned (muted bg) for others
- Shows sender avatar + name for group messages (first in group only)
- Timestamp on hover or below last message in group
- Hover actions: Copy, Edit, Delete (for own messages)

### 9. Message Input (`MessageInput.tsx`)
- Auto-expanding textarea (1-6 lines)
- Send on Enter, Shift+Enter for newline
- Attachment button (paperclip icon) -- visual only for now
- Send button (disabled when empty)
- Character counter near limit (4000 chars)
- Draft persistence via Zustand store

### 10. Chat Header (`ChatHeader.tsx`)
- Avatar + name + online status
- Member count for groups
- Search icon button (visual only)
- Info/detail panel toggle button
- Phone/video call buttons (disabled, future)

### 11. Detail Panel (`DetailPanel.tsx`)
- Conversation info section (name, description for groups)
- Members list with avatars and roles
- "Shared Files" section (empty state for now)
- "Notification Settings" toggle (visual only)
- "Leave Group" button for groups

### 12. New DM Dialog (`NewDMDialog.tsx`)
- Search input to filter reachable users
- List of users with avatar, name, role
- Click to "start" conversation (adds to mock list)

### 13. New Group Dialog (`NewGroupDialog.tsx`)
- Step 1: Group name + description
- Step 2: Select members (checkbox list with search)
- Create button (adds to mock list)

### 14. Small Components
- `EmptyState.tsx` -- "No conversations yet" / "Select a conversation"
- `TypingIndicator.tsx` -- Three bouncing dots animation
- `OnlineStatus.tsx` -- Green (online) / gray (offline) dot
- `UnreadBadge.tsx` -- Red circle with count
- `MessageDateDivider.tsx` -- "Today", "Yesterday", "Feb 15"
- `SystemMessage.tsx` -- Centered italic text for system events

## Routing Changes

### `src/App.tsx`
Add two new lazy-loaded routes inside the protected route group:
```
/chat          -- Chat page with no conversation selected
/chat/:conversationId  -- Chat page with conversation open
```

## Sidebar Changes

### `src/components/layout/AppSidebar.tsx`
- Add "Chat" item to `mainNavItems` between "Reports" and the Organization group
- Icon: `MessageSquare` from lucide-react
- Show unread badge (red dot with count) from `useChatStore.totalUnread`

## Styling Notes

- All components use existing shadcn/ui primitives (Card, Avatar, Badge, Button, Dialog, ScrollArea, Input, Tabs, Separator)
- Message bubbles: sender uses `bg-primary text-primary-foreground`, receiver uses `bg-muted text-foreground`
- Online dot: `bg-green-500` with a white ring
- Follows existing dark/light theme via semantic Tailwind classes
- Animations: message slide-up on appear, detail panel slide from right
- Responsive: mobile shows one panel at a time with back button navigation

## Files Modified (Existing)

| File | Change |
|---|---|
| `src/App.tsx` | Add lazy import + 2 routes for `/chat` and `/chat/:conversationId` |
| `src/components/layout/AppSidebar.tsx` | Add "Chat" nav item with `MessageSquare` icon + unread badge |

## Files Created (New)

| File | Purpose |
|---|---|
| `src/features/chat/index.ts` | Default export |
| `src/features/chat/Chat.tsx` | Main page layout |
| `src/features/chat/types.ts` | TypeScript interfaces |
| `src/features/chat/mockData.ts` | Mock conversations + messages |
| `src/features/chat/stores/useChatStore.ts` | Zustand UI state |
| `src/features/chat/components/ConversationList.tsx` | Left panel |
| `src/features/chat/components/ConversationItem.tsx` | Conversation row |
| `src/features/chat/components/ConversationSearch.tsx` | Search input |
| `src/features/chat/components/MessageArea.tsx` | Center message panel |
| `src/features/chat/components/MessageBubble.tsx` | Message component |
| `src/features/chat/components/MessageInput.tsx` | Input with toolbar |
| `src/features/chat/components/MessageDateDivider.tsx` | Date separator |
| `src/features/chat/components/SystemMessage.tsx` | System event messages |
| `src/features/chat/components/ChatHeader.tsx` | Conversation header |
| `src/features/chat/components/DetailPanel.tsx` | Right info panel |
| `src/features/chat/components/NewDMDialog.tsx` | New DM dialog |
| `src/features/chat/components/NewGroupDialog.tsx` | New group dialog |
| `src/features/chat/components/EmptyState.tsx` | Placeholder states |
| `src/features/chat/components/TypingIndicator.tsx` | Typing animation |
| `src/features/chat/components/OnlineStatus.tsx` | Status dot |
| `src/features/chat/components/UnreadBadge.tsx` | Unread count badge |

Total: 21 new files, 2 modified files. No new dependencies needed.
