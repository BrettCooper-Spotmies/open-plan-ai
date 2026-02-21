

# Fix Invite Flow for New vs Existing Users + Dashboard Pending Invitations Badge

## Problem Summary

1. **All invite links go to `/join-org`** which shows "Please log in" -- but new users (no account) need to go to signup instead
2. **Login page ignores `?redirect=` query param** -- after login, users don't get redirected back to `/join-org`
3. **No dashboard notification** for pending invitations the user missed

## Solution

### 1. Smart Invite Flow: Differentiate New vs Existing Users

Update the **`send-team-invite` edge function** to check if the invited email already has an account:
- **Existing user**: invite link goes to `/join-org?invite=TOKEN` (current behavior, correct)
- **New user**: invite link goes to `/signup?invite=TOKEN` (the original flow for new users)

This way, each user type gets the right experience automatically.

### 2. Fix Login Redirect for `/join-org`

Update **`Login.tsx`** to read the `redirect` query parameter from the URL. After successful login, redirect to the `redirect` param (e.g., `/join-org?invite=TOKEN`) instead of always going to `/`.

### 3. Dashboard Pending Invitations Banner

Add a banner on the **Dashboard** that shows when the logged-in user has pending invitations they haven't accepted yet. This handles the case where a user misses the invite link.

- Query `team_invitations` where `email` matches the current user's email, `status = 'pending'`, and not expired
- Show a banner card with the org name and a "Join" button
- On click, call `accept-invite` edge function directly (no need to navigate away)
- After accepting, refresh organizations and dismiss the banner

---

## Technical Details

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/send-team-invite/index.ts` | Check if email exists in profiles; if yes, link to `/join-org?invite=TOKEN`; if no, link to `/signup?invite=TOKEN` |
| `src/pages/Login.tsx` | Read `redirect` from URL search params; after successful login, navigate to that path instead of `from` |
| `src/features/dashboard/Dashboard.tsx` | Add a query for pending invitations matching the user's email; render a banner with "Join" button; call `accept-invite` on click |

### Edge Function Change (send-team-invite)

The function already checks if a profile exists for the email (lines 100-120). Use that result to decide the invite URL:

```
if (existingProfile) -> /join-org?invite=TOKEN
else -> /signup?invite=TOKEN
```

### Login Redirect Fix

Read `?redirect=` from `useSearchParams()`. If present, use it as the post-login destination instead of `location.state.from`.

### Dashboard Pending Invitations

- Use a `useQuery` to fetch pending invitations for the current user's email
- Show a compact banner (similar to the existing "Create Organization" banner) with org name, role, and "Join" action button
- On accept: invoke `accept-invite`, then `refreshOrganizations()`, invalidate the query, and show a success toast

