import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  initials: string;
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

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('id, email, name, avatar_url, initials')
      .single();

    if (error) throw error;
    return data as Profile;
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

    // Update profile with new avatar URL
    await this.updateProfile({ avatar_url: publicUrl });

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
    await this.updateProfile({ avatar_url: null });
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
