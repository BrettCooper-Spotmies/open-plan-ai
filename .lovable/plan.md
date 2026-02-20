

# Fix Chat RLS Policies — "Failed to start conversation" Error

## Problem

When a user creates a DM or group, the code:
1. Inserts a row into `conversations` (passes — `created_by = auth.uid()`)
2. Batch-inserts multiple rows into `conversation_members` (fails on the second row)

The `conversation_members` INSERT policy currently allows:
- `user_id = auth.uid()` — works for adding yourself
- `is_conversation_member(conversation_id)` — fails because you haven't been committed as a member yet (same statement)

The second member row (the other user in a DM, or any non-self member in a group) fails both checks, causing the RLS violation.

## Solution

Update the `conversation_members` INSERT policy to also allow the **conversation creator** to add members. This is done by checking if `auth.uid()` matches `conversations.created_by` for the given `conversation_id`.

### Database Migration

Drop and recreate the `conversation_members` INSERT policy:

```sql
DROP POLICY "Conversation creators can add members" ON public.conversation_members;

CREATE POLICY "Conversation creators can add members"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id
      AND created_by = auth.uid()
  )
);
```

This means:
- You can always add **yourself** to a conversation (`user_id = auth.uid()`)
- The **creator** of a conversation can add **anyone** (`conversations.created_by = auth.uid()`)

No code changes needed — only the RLS policy fix.

## Why This Is Safe

- Only the person who created the conversation can add members during creation
- Existing members can still add members via the `is_conversation_member` check — but we should keep that too for future "invite to group" functionality

### Updated Policy (Final)

```sql
DROP POLICY "Conversation creators can add members" ON public.conversation_members;

CREATE POLICY "Conversation creators and members can add members"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR is_conversation_member(conversation_id)
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id
      AND created_by = auth.uid()
  )
);
```

This preserves the original intent while adding the missing creator check.

## Files Changed

| Action | File |
|---|---|
| DB Migration | Update `conversation_members` INSERT RLS policy |

No application code changes required. The fix is entirely at the database level.
