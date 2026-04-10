import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  initials: string;
}

async function persistAvatarUrlForCurrentUser(avatarUrl: string | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Preferred path: use server-side SECURITY DEFINER RPC (robust against
  // legacy profile-row shapes and restrictive RLS combinations).
  const rpcRes = await supabase.rpc('update_my_profile_avatar', {
    p_avatar_url: avatarUrl,
  } as { p_avatar_url: string | null });
  if (!rpcRes.error) return;

  // First try direct update on canonical row (profiles.id = auth.users.id)
  const updateRes = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();

  if (!updateRes.error && updateRes.data) return;

  // At this point, direct updates did not affect any row and RPC failed.
  // Avoid client-side upsert because it can be blocked by RLS INSERT policies.
  throw updateRes.error || rpcRes.error || new Error('Failed to persist avatar URL');
}

export const profileService = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url, initials')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data as Profile | null;
  },

  /**
   * Update profile fields
   */
  async updateProfile(updates: Partial<Omit<Profile, 'id' | 'email'>>): Promise<Profile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate initials if name is being updated
    if (updates.name && !updates.initials) {
      updates.initials = updates.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    const profileSelect = 'id, email, name, avatar_url, initials';
    const isNoRowsError = (error: unknown): boolean => {
      if (!error || typeof error !== 'object') return false;
      const maybe = error as { code?: string; message?: string };
      return maybe.code === 'PGRST116' || (typeof maybe.message === 'string' && maybe.message.includes('0 rows'));
    };

    // Primary path: profiles.id = auth.users.id
    const primary = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select(profileSelect)
      .maybeSingle();

    if (!primary.error && primary.data) {
      return primary.data as Profile;
    }
    if (primary.error && !isNoRowsError(primary.error)) {
      throw primary.error;
    }

    // Fallback path: some deployments still use profiles.user_id.
    try {
      // @ts-expect-error - user_id is present in some DB variants but missing from generated types
      const fallback = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select(profileSelect)
        .maybeSingle();
      if (!fallback.error && fallback.data) {
        return fallback.data as Profile;
      }
      if (fallback.error && !isNoRowsError(fallback.error)) {
        throw fallback.error;
      }
    } catch (error) {
      // Continue to upsert recovery below.
    }

    // Recovery path: ensure a profile row exists, then return it.
    const fallbackName =
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.email?.split('@')[0] ?? 'User');
    const fallbackInitials = fallbackName
      .split(' ')
      .filter(Boolean)
      .map((token) => token[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

    const upsertPayload: Record<string, unknown> = {
      id: user.id,
      email: user.email ?? '',
      name: fallbackName,
      initials: fallbackInitials,
      ...updates,
    };

    const upsertRes = await supabase
      .from('profiles')
      .upsert(upsertPayload as never, { onConflict: 'id' })
      .select(profileSelect)
      .maybeSingle();

    if (upsertRes.error) throw upsertRes.error;
    if (!upsertRes.data) {
      throw new Error('Failed to update profile');
    }
    return upsertRes.data as Profile;
  },

  /**
   * Upload avatar image to storage bucket
   */
  async uploadAvatar(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    // Use MIME type for extension to prevent spoofing
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const fileExt = mimeToExt[file.type] || 'jpg';
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    // Delete old avatar if exists
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(user.id);
    
    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
    }

    // Upload new avatar with content type enforcement
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Persist avatar URL on the canonical profile row.
    await persistAvatarUrlForCurrentUser(publicUrl);

    return publicUrl;
  },

  /**
   * Delete avatar from storage
   */
  async deleteAvatar(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // List and delete all avatar files for this user
    const { data: files } = await supabase.storage
      .from('avatars')
      .list(user.id);

    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
    }

    // Clear avatar_url in profile
    await persistAvatarUrlForCurrentUser(null);
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  /**
   * Delete account (soft delete profile + sign out)
   */
  async deleteAccount(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Soft delete the profile
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) throw error;

    // Sign out
    await supabase.auth.signOut();
  },
};
