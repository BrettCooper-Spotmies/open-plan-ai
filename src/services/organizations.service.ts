import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface OrganizationSettings {
  companyName?: string;
  companySize?: string;
  timezone?: string;
  dateFormat?: string;
  logoUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  settings: OrganizationSettings | Json;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profile?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    initials: string;
  };
}

export const organizationsService = {
  /**
   * Get all organizations the current user belongs to
   */
  async getAll(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new organization and add current user as owner
   */
  async create(org: { name: string; slug: string; description?: string }): Promise<Organization> {
    // Use the SECURITY DEFINER function to create organization + owner membership atomically
    const { data, error } = await supabase.rpc('create_organization_with_owner', {
      org_name: org.name,
      org_slug: org.slug,
      org_description: org.description || null,
    });

    if (error) throw error;
    return data as Organization;
  },

  /**
   * Update organization
   */
  async update(id: string, updates: { name?: string; description?: string | null; settings?: Json }): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft delete organization
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get members of an organization
   */
  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        user_id,
        role,
        joined_at,
        profile:profiles(id, name, email, avatar_url, initials)
      `)
      .eq('organization_id', orgId);

    if (error) throw error;
    
    return (data || []).map(member => ({
      ...member,
      profile: Array.isArray(member.profile) ? member.profile[0] : member.profile
    })) as OrganizationMember[];
  },

  /**
   * Add member to organization
   */
  async addMember(orgId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: userId,
        role,
      });

    if (error) throw error;
  },

  /**
   * Update member role
   */
  async updateMemberRole(orgId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Remove member from organization
   */
  async removeMember(orgId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Update organization settings (stored in JSONB field)
   */
  async updateSettings(orgId: string, settings: OrganizationSettings): Promise<Organization> {
    // Get current settings and merge with new ones
    const { data: current, error: fetchError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single();

    if (fetchError) throw fetchError;

    const mergedSettings = {
      ...(current?.settings as OrganizationSettings || {}),
      ...settings,
    };

    const { data, error } = await supabase
      .from('organizations')
      .update({ settings: mergedSettings as unknown as Json })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Upload organization logo to storage bucket
   */
  async uploadLogo(orgId: string, file: File): Promise<string> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and SVG images are allowed.');
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
      'image/svg+xml': 'svg',
    };
    const fileExt = mimeToExt[file.type] || 'png';
    const fileName = `${orgId}/logo-${Date.now()}.${fileExt}`;

    // Delete old logo if exists
    const { data: existingFiles } = await supabase.storage
      .from('logos')
      .list(orgId);
    
    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${orgId}/${f.name}`);
      await supabase.storage.from('logos').remove(filesToDelete);
    }

    // Upload new logo with content type enforcement
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    // Update organization settings with new logo URL
    await this.updateSettings(orgId, { logoUrl: publicUrl });

    return publicUrl;
  },

  /**
   * Delete organization logo from storage
   */
  async deleteLogo(orgId: string): Promise<void> {
    // List and delete all logo files for this org
    const { data: files } = await supabase.storage
      .from('logos')
      .list(orgId);

    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${orgId}/${f.name}`);
      await supabase.storage.from('logos').remove(filesToDelete);
    }

    // Clear logoUrl in settings
    await this.updateSettings(orgId, { logoUrl: undefined });
  },

  /**
   * Get all organizations a specific user belongs to
   */
  async getMemberOrganizations(userId: string): Promise<{ organization_id: string; role: string }[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Generate a unique slug from name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
  },
};
