

# Chat Group Management, Shared Files, Mentions, and Invite Flow for Existing Users

## Overview

| # | Feature | Summary |
|---|---------|---------|
| 1 | Add/Remove group members | Admin/owner can add or remove members from an existing group conversation via the Detail Panel |
| 2 | Shared files in Detail Panel | Query file-type messages from the conversation and display them in the "Shared Files" section |
| 3 | @mention team members in groups | Type `@` in the message input to see a dropdown of group members; insert `@Name` which renders highlighted |
| 4 | Join Organization page for existing users | Instead of redirecting existing users to the signup page, create a `/join-org` page that lets logged-in users accept the invite directly |

---

## 1. Add/Remove Group Members

### Changes

**DetailPanel.tsx**
- Add an "Add Member" button (only visible for group conversations where current user is owner/admin)
- Each non-owner member gets a "Remove" button (X icon) visible to owners/admins
- "Add Member" opens a small dialog listing reachable users not already in the group
- On add: call `chatService.addMemberToGroup(conversationId, userId)`
- On remove: call `chatService.removeMemberFromGroup(conversationId, userId)`
- After each action, refetch conversations to update member list

**chat.service.ts** -- add two new methods:
- `addMemberToGroup(conversationId, userId)` -- insert into `conversation_members`
- `removeMemberFromGroup(conversationId, userId)` -- delete from `conversation_members`

**Chat.tsx**
- Pass `refetch` (conversation refetch) to `DetailPanel` so it can refresh after member changes

**conversation_members RLS** -- already allows members to add/remove via existing policies (INSERT for members/creators, DELETE for members). No migration needed.

### "Leave Group" button
- Wire the existing "Leave Group" button in DetailPanel to call `removeMemberFromGroup(conversationId, currentUserId)`, then navigate back to `/chat`.

---

## 2. Shared Files in Detail Panel

### Changes

**DetailPanel.tsx**
- Accept a new prop `sharedFiles` (or fetch internally)
- Query `chat_messages` where `conversation_id = X` and `content_type = 'file'` and `deleted_at IS NULL`, ordered by `created_at DESC`, limit 20
- Parse the JSON content of each file message to extract `fileName`, `fileSize`, `mimeType`, `url`
- Display each file as a clickable card (image thumbnail or file icon + name + size)
- Replace the current "No shared files yet" placeholder with the actual list

**chat.service.ts** -- add new method:
- `getSharedFiles(conversationId)` -- fetches file messages and returns parsed file metadata

---

## 3. @Mention Feature for Groups

### Changes

**MessageInput.tsx**
- Detect when user types `@` in the textarea
- Show a floating dropdown/popover above the cursor position listing group members (filtered as user types after `@`)
- On selecting a member, replace `@partial` with `@MemberName` in the text
- Accept `members` prop from Chat.tsx (the active conversation's members excluding self)

**MessageBubble.tsx**
- Parse message content for `@Name` patterns matching conversation members
- Render mentions with a highlighted style (e.g., `bg-primary/20 text-primary font-medium rounded px-0.5`)

**Chat.tsx**
- Pass `activeConv.members` to `MessageInput` so it knows who can be mentioned

No database changes needed -- mentions are stored as plain text `@Name` in the message content.

---

## 4. Join Organization Page for Existing Users

### The Problem
When an existing user receives an invite email, the link goes to `/signup?invite=TOKEN`. Since they already have an account, they see the registration form, which will fail (duplicate email).

### Solution
- Update the invite email link to go to `/join-org?invite=TOKEN` instead of `/signup?invite=TOKEN`
- Create a new `/join-org` page that:
  - If the user is **logged in**: shows the org name, role, and a "Join Organization" button that calls the `accept-invite` edge function
  - If the user is **not logged in**: shows a message "Please log in to accept this invitation" with a link to `/login?redirect=/join-org?invite=TOKEN`
- Keep the `/signup?invite=TOKEN` flow working for new users (add a "Don't have an account? Sign up" link on the join-org page)

### Changes

**New: `src/pages/JoinOrganization.tsx`**
- Read `invite` token from URL params
- Fetch invitation details (org name, role) from `team_invitations` table using the token
- If logged in: show "Join [OrgName] as [Role]" with accept button
- If not logged in: show login prompt with redirect back
- On accept: call `accept-invite` edge function, then navigate to `/`
- Show error states for expired/invalid tokens

**send-team-invite edge function**
- Update the invite link from `/signup?invite=TOKEN` to `/join-org?invite=TOKEN`

**App.tsx**
- Add public route: `<Route path="/join-org" element={<JoinOrganization />} />`

**JoinOrganization.tsx** -- also include a "New to OpenPlan AI? Create an account" link that goes to `/signup?invite=TOKEN` for users who don't have an account yet.

---

## Technical Details -- Files Changed

| File | Changes |
|---|---|
| `src/features/chat/components/DetailPanel.tsx` | Add/remove members UI, shared files display, leave group wiring |
| `src/services/chat.service.ts` | Add `addMemberToGroup`, `removeMemberFromGroup`, `getSharedFiles` methods |
| `src/features/chat/Chat.tsx` | Pass `refetch` to DetailPanel, pass `members` to MessageInput |
| `src/features/chat/components/MessageInput.tsx` | @mention detection, dropdown, and insertion |
| `src/features/chat/components/MessageBubble.tsx` | Render @mentions with highlighted style |
| `src/pages/JoinOrganization.tsx` | **New** -- join org page for existing users |
| `src/App.tsx` | Add `/join-org` route |
| `supabase/functions/send-team-invite/index.ts` | Change invite link from `/signup` to `/join-org` |

