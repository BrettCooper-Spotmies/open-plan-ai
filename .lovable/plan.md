
# Fix: Pre-fill Invited Email on Invite Signup

## Problem

When a user clicks an invitation link (`/signup?invite=TOKEN`), the email field should be pre-filled with the invited email (e.g., `spotmies@gmail.com`). Currently, the code never fetches the invitation details from the database, so the email field starts empty and gets browser-autofilled with the wrong email (`protrace.ai@gmail.com`).

## Solution

Add a `useEffect` in `Signup.tsx` that fetches the invitation record from the `team_invitations` table using the invite token, then pre-fills and locks the email field with the invited email.

## Changes

### File: `src/pages/Signup.tsx`

1. Add a `useEffect` that runs when `inviteToken` is present:
   - Query `team_invitations` table where `token = inviteToken` and `status = 'pending'`
   - Set `formData.email` to the invitation's email
   - Optionally show the organization name in the UI

2. Make the email input `readOnly` (not just blocked via `handleChange`) when an invite token is present, so the browser doesn't autofill over it

3. Remove the flawed `handleChange` guard (line 53) since `readOnly` on the input handles it properly

```typescript
// New useEffect to fetch invitation details
useEffect(() => {
  if (inviteToken) {
    const fetchInvitation = async () => {
      const { data } = await supabase
        .from('team_invitations')
        .select('email')
        .eq('token', inviteToken)
        .eq('status', 'pending')
        .single();
      if (data?.email) {
        setFormData(prev => ({ ...prev, email: data.email }));
      }
    };
    fetchInvitation();
  }
}, [inviteToken]);
```

And on the email `<Input>`:
```tsx
<Input
  ...
  readOnly={isInviteSignup}
  className={cn("pl-10", isInviteSignup && "bg-muted cursor-not-allowed")}
/>
```

---

| File | Change |
|------|--------|
| `src/pages/Signup.tsx` | Add useEffect to fetch invitation email by token; make email field readOnly for invite signups |
