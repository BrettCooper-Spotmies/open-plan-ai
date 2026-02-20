

# Fix: DM Name Shows Wrong User + Messages Not Aligned Correctly

## Root Cause

Three components import `CURRENT_USER_ID` from `mockData.ts`, which is hardcoded as `'current-user'`. Since the real authenticated user has a UUID like `a1b2c3...`, the comparison never matches:

- **ConversationItem.tsx** and **ChatHeader.tsx**: `members.find(m => m.id !== 'current-user')` fails to filter out the logged-in user, so the DM shows the wrong name (your own name instead of the other person's)
- **MessageBubble.tsx**: `message.senderId === 'current-user'` is always false, so every message renders as a received message (left-aligned, gray bubble) instead of showing your own messages on the right in blue

## Solution

Replace the hardcoded `CURRENT_USER_ID` import with the real user ID from `useAuth()` in all three components.

### Changes

| File | Change |
|---|---|
| `src/features/chat/components/ChatHeader.tsx` | Replace `CURRENT_USER_ID` import with `useAuth()` hook; use `user.id` |
| `src/features/chat/components/ConversationItem.tsx` | Replace `CURRENT_USER_ID` import with `useAuth()` hook; use `user.id` |
| `src/features/chat/components/MessageBubble.tsx` | Replace `CURRENT_USER_ID` import with `useAuth()` hook; use `user.id` |
| `src/features/chat/components/MessageArea.tsx` | Pass `currentUserId` to `MessageBubble` if needed (check how it's structured) |
| `src/features/chat/components/DetailPanel.tsx` | Check if it also uses `CURRENT_USER_ID` and fix if so |

### Technical Detail

Each component will change from:
```typescript
import { CURRENT_USER_ID } from '../mockData';
// ...
const isOwn = message.senderId === CURRENT_USER_ID;
```

To:
```typescript
import { useAuth } from '@/contexts/AuthContext';
// ...
const { user } = useAuth();
const isOwn = message.senderId === user?.id;
```

No database changes needed. No new files.

