# Add Message Reactions (Emoji) to Chat Messages

## Overview

Add the ability for users to react to any chat message with emojis. Reactions will appear below message bubbles as small emoji pills with counts, and users can add reactions via a smiley-face button in the hover toolbar.

## Database Changes

### New table: `message_reactions`


| Column     | Type        | Notes                                  |
| ---------- | ----------- | -------------------------------------- |
| id         | uuid        | Primary key, default gen_random_uuid() |
| message_id | uuid        | NOT NULL, references chat_messages     |
| user_id    | uuid        | NOT NULL                               |
| emoji      | text        | NOT NULL (e.g. "thumbsup", "heart")    |
| created_at | timestamptz | default now()                          |


- Unique constraint on (message_id, user_id, emoji) to prevent duplicate reactions
- RLS policies:
  - SELECT: user is a conversation member (via message -> conversation)
  - INSERT: user_id = auth.uid() AND is conversation member
  - DELETE: user_id = auth.uid() (can remove own reactions)
- Enable realtime for live reaction updates

## Code Changes


| File                                             | Change                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/features/chat/types.ts`                     | Add `MessageReaction` interface and `reactions?: MessageReaction[]` to `ChatMessage`             |
| `src/services/chat.service.ts`                   | Add `toggleReaction(messageId, emoji)`, `getReactions(messageIds)` methods                       |
| `src/features/chat/chat.mappers.ts`              | No change needed -- reactions fetched separately                                                 |
| `src/features/chat/components/MessageBubble.tsx` | Add smiley button to hover toolbar; render reaction pills below bubble; add emoji picker popover |
| `src/features/chat/components/MessageArea.tsx`   | Pass `onToggleReaction` callback and `reactionMap` to MessageBubble                              |
| `src/features/chat/Chat.tsx`                     | Fetch reactions alongside messages; create `handleToggleReaction` handler                        |
| `src/features/chat/hooks/useChatData.ts`         | Fetch reactions when messages load; return `reactionMap`                                         |


## UI Design

- A **smiley face icon** button appears in the hover toolbar (next to copy/edit/delete)
- Clicking it opens a small popover with a curated set of common emojis (6-8 emojis like thumbs up, heart, laugh, surprised, sad, fire, clap, 100)
- Below each message bubble, reactions are displayed as small rounded pills: `[emoji] [count]`
- Clicking an existing reaction pill toggles it (add/remove your reaction)
- Pills for emojis you've reacted with get a highlighted border

## Technical Details

### MessageReaction type

```typescript
interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe: boolean;
}
```

### Toggle logic

- `toggleReaction(messageId, emoji)`: checks if row exists for (message_id, user_id, emoji); if yes, deletes it; if no, inserts it. Then refetches reactions for that message.

### Emoji set (no external library needed)

A simple array of Unicode emojis: `['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '💯'], apart from this user can able to react with emoji whatever they want.` 