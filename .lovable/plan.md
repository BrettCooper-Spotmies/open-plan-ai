
# Team Invitation System Integration

## Overview
Implement a complete team invitation flow where admins can invite new members via email. The system will send a unique registration link using Resend, and invitees can join the organization through that link.

## Flow

1. Admin clicks "Invite Member" on `/team` page, enters email and role
2. Backend function creates an invitation record with a unique token
3. An email is sent via Resend with a registration link containing the token
4. Invitee clicks the link, lands on a signup page pre-filled with their email
5. After registration + email verification, they are automatically added to the organization

## Implementation

### 1. Database: Create `team_invitations` table

A new migration to create the invitations table:

```sql
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, email, status)
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Admins/owners can manage invitations for their org
CREATE POLICY "Org admins can manage invitations"
  ON public.team_invitations
  FOR ALL
  TO authenticated
  USING (has_org_access(organization_id))
  WITH CHECK (
    has_org_role(organization_id, 'admin') OR has_org_role(organization_id, 'owner')
  );

-- Anyone can read their own invitation by token (for accepting)
CREATE POLICY "Users can read invitations by token"
  ON public.team_invitations
  FOR SELECT
  TO authenticated
  USING (true);
```

### 2. Edge Function: `send-team-invite`

A new edge function at `supabase/functions/send-team-invite/index.ts` that:

- Accepts `{ email, role, orgId }` from an authenticated admin
- Validates the caller is an admin/owner of the organization (using service role to check `organization_members`)
- Checks for existing pending invitations for the same email+org
- Generates a unique invitation token (crypto.randomUUID)
- Stores the invitation in `team_invitations` with a 7-day expiry
- Sends an email via Resend with a link like: `https://openplanai.lovable.app/signup?invite=TOKEN`
- Returns success/error

The function will:
- Use `RESEND_API_KEY` (already configured)
- Use `SUPABASE_SERVICE_ROLE_KEY` for DB operations
- Validate the JWT from the Authorization header to identify the caller
- Check that the caller has admin/owner role in the org

### 3. Edge Function: `accept-invite`

A new edge function at `supabase/functions/accept-invite/index.ts` that:

- Called after a user completes signup + email verification
- Accepts `{ token }` from an authenticated user
- Validates the token exists and is not expired
- Adds the user to `organization_members` with the invited role
- Updates the invitation status to `accepted`

### 4. Frontend: Update Signup page

Modify `src/pages/Signup.tsx` to:
- Read `?invite=TOKEN` from URL query params
- If present, fetch the invitation details (email, org name) to pre-fill and lock the email field
- After successful signup + verification, call the `accept-invite` edge function

### 5. Frontend: Update Team service

Modify `src/services/team.service.ts`:
- Replace the stub `invite()` method with a call to the `send-team-invite` edge function
- Add `getPendingInvitations()` method to fetch pending invitations for the current org
- Add `cancelInvitation()` method

### 6. Frontend: Update Team page

Modify `src/features/team/Team.tsx`:
- Only show the "Invite Member" button for admins/owners (check current user's org role)
- Display pending invitations in the team list with "pending" status
- Add ability to cancel/resend invitations

### 7. Frontend: Post-signup invitation acceptance

Modify the auth flow:
- In `src/pages/Signup.tsx`, store the invite token in localStorage before signup
- After email verification completes and user is redirected to the app, check for stored invite token
- If found, call `accept-invite` edge function and clear the token

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | `team_invitations` table with RLS |
| `supabase/functions/send-team-invite/index.ts` | Create | Edge function to create invitation and send email |
| `supabase/functions/accept-invite/index.ts` | Create | Edge function to accept invitation after signup |
| `src/services/team.service.ts` | Modify | Wire up invite/cancel/list invitations via edge functions |
| `src/hooks/useTeam.ts` | Modify | Add hooks for invitations |
| `src/features/team/Team.tsx` | Modify | Admin-only invite button, show pending invitations |
| `src/pages/Signup.tsx` | Modify | Handle `?invite=TOKEN` query param, pre-fill email |
| `src/contexts/AuthContext.tsx` | Modify | After login, check for pending invite token and accept |

## Security Considerations

- Only admins/owners can send invitations (enforced at both edge function and RLS level)
- Invitation tokens are cryptographically random UUIDs
- Tokens expire after 7 days
- Rate limiting on the edge function (reuse existing IP rate limiting pattern)
- RLS ensures users can only see invitations within their organization
- The `accept-invite` function validates the token server-side with service role

## Important Note on Email Delivery

Due to the current Resend configuration (testing mode), invitation emails can only be delivered to `protrace.ai@gmail.com` until a sending domain is verified at resend.com. This limitation applies to all Resend-sent emails in this project.
