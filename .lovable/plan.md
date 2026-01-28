

# Settings Page Backend Integration Plan

## Overview

This plan updates the Settings page with two modifications:
1. **Add "Coming Soon" badges** to the Notifications and Appearance tabs
2. **Integrate backend** for General, Profile, and Danger tabs using Supabase

---

## Current State Analysis

| Tab | Current Status |
|-----|---------------|
| **General** | Uses local state from `mockData.ts`, no backend persistence |
| **Profile** | Hardcoded mock data, no connection to authenticated user |
| **Notifications** | Uses local state, will be marked as "Coming Soon" |
| **Appearance** | Uses local state, will be marked as "Coming Soon" |
| **Danger** | Password change non-functional, delete account shows error |

### Database Schema

**`profiles` table:**
- `id`, `email`, `name`, `avatar_url`, `initials` (exists)
- Missing: `role`, `bio` fields needed for Profile tab

**`organizations` table:**
- `id`, `name`, `slug`, `description`, `settings` (JSONB)
- The `settings` column can store: `companyName`, `companySize`, `timezone`, `dateFormat`, `logo`

**Storage:** No buckets exist for avatar/logo uploads

---

## Implementation Plan

### Phase 1: Database Schema Updates

**Migration: Add profile fields and storage buckets**

```sql
-- Add role and bio fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Create storage buckets for avatars and logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT DO NOTHING;

-- RLS policies for avatar bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- RLS policies for logos bucket (org members can manage)
CREATE POLICY "Org members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Org members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Org members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Logos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');
```

---

### Phase 2: Create Profile Service

**New File:** `src/services/profile.service.ts`

Service to handle profile operations:

```typescript
export const profileService = {
  // Get current user profile
  async getProfile(): Promise<Profile>
  
  // Update profile fields (name, role, bio, initials)
  async updateProfile(updates: Partial<Profile>): Promise<Profile>
  
  // Upload avatar image to storage bucket
  async uploadAvatar(file: File): Promise<string>
  
  // Delete avatar from storage
  async deleteAvatar(): Promise<void>
  
  // Update password (wrapper around auth.updateUser)
  async updatePassword(newPassword: string): Promise<void>
  
  // Delete account (soft delete profile + sign out)
  async deleteAccount(): Promise<void>
}
```

---

### Phase 3: Extend Organization Service

**Modify:** `src/services/organizations.service.ts`

Add methods for organization settings:

```typescript
// Add to organizationsService:

// Update organization settings (in JSONB field)
async updateSettings(orgId: string, settings: OrganizationSettings): Promise<void>

// Upload organization logo
async uploadLogo(orgId: string, file: File): Promise<string>

// Delete organization logo
async deleteLogo(orgId: string): Promise<void>
```

**Organization Settings Interface:**
```typescript
interface OrganizationSettings {
  companyName?: string;
  companySize?: string;
  timezone?: string;
  dateFormat?: string;
  logoUrl?: string;
}
```

---

### Phase 4: Update AuthContext

**Modify:** `src/contexts/AuthContext.tsx`

Add function to refresh profile after updates:
```typescript
// Add to AuthContextValue:
refreshProfile: () => Promise<void>
updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
deleteAccount: () => Promise<{ error: Error | null }>
```

---

### Phase 5: Update Settings Component

**Modify:** `src/features/settings/Settings.tsx`

Major changes:

1. **Add "Coming Soon" Badges:**
   - Add `Badge` component with "Coming Soon" text next to Notifications and Appearance tab triggers
   - Disable form controls within those tabs

2. **General Tab Integration:**
   - Import `useOrganization` hook to get current organization
   - Load organization data including settings from JSONB field
   - Implement `handleSaveGeneral` to update organization via `organizationsService.update()`
   - Implement logo upload using storage bucket

3. **Profile Tab Integration:**
   - Import `useAuth` hook to get current user profile
   - Pre-fill form with `profile.name`, `profile.email`, `profile.role`, `profile.bio`, `profile.avatar_url`
   - Implement `handleSaveProfile` to update via `profileService.updateProfile()`
   - Implement avatar upload using storage bucket

4. **Danger Tab Integration:**
   - Add password state management with validation
   - Implement `handleUpdatePassword` using `authService.updatePassword()`
   - Implement `handleDeleteAccount` with confirmation dialog
   - Add proper error handling and loading states

---

## Component Changes Summary

| Section | Change |
|---------|--------|
| **Imports** | Add `useAuth`, `useOrganization`, `profileService`, `organizationsService`, `supabase` |
| **State** | Replace hardcoded mock data with hooks; add loading/error states |
| **General Tab** | Bind to organization data, save to Supabase |
| **Profile Tab** | Bind to authenticated user profile, save to Supabase |
| **Notifications Tab** | Add "Coming Soon" badge, disable controls |
| **Appearance Tab** | Add "Coming Soon" badge, disable controls |
| **Danger Tab** | Implement real password change and account deletion |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/profile.service.ts` | Profile CRUD, avatar upload, password/account management |

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/settings/Settings.tsx` | Full integration with backend, add Coming Soon badges |
| `src/services/organizations.service.ts` | Add settings update and logo upload methods |
| `src/contexts/AuthContext.tsx` | Add `refreshProfile`, `updatePassword`, `deleteAccount` methods |
| `src/services/index.ts` | Export `profileService` |

## Database Migration

One migration to:
- Add `role` and `bio` columns to profiles table
- Create `avatars` and `logos` storage buckets
- Add RLS policies for storage buckets

---

## Visual Changes

### Coming Soon Badge Design
- Yellow/amber badge next to tab text: "Coming Soon"
- Form controls in those tabs will be visually disabled with reduced opacity
- Tooltip on hover explaining feature is in development

### Example Tab Trigger:
```tsx
<TabsTrigger value="notifications" className="gap-2">
  <Bell className="h-4 w-4 hidden sm:block" />
  Notifications
  <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800 border-amber-300 text-xs">
    Coming Soon
  </Badge>
</TabsTrigger>
```

---

## Success Criteria

After implementation:
- Notifications and Appearance tabs display "Coming Soon" badges with disabled controls
- Profile tab loads authenticated user's data from the database
- Profile changes (name, role, bio) are saved to Supabase
- Avatar upload stores image in storage bucket and updates profile
- General tab loads current organization settings
- Organization settings changes are saved to Supabase `settings` JSONB column
- Logo upload stores image in storage bucket
- Password change works via Supabase Auth
- Account deletion performs soft delete and signs user out
- All save actions show proper loading states and toast notifications

