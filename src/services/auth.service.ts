import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface SignUpMetadata {
  name?: string;
  company?: string;
  industry?: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export const authService = {
  /**
   * Sign up a new user with email and password
   */
  async signUp(
    email: string, 
    password: string, 
    metadata?: SignUpMetadata
  ): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    
    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  },

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  },

  /**
   * Get current session
   */
  async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  /**
   * Get current user
   */
  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.refreshSession();
    return { session: data.session, error };
  },

  /**
   * Send OTP for email verification
   */
  async sendOtp(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email },
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data?.error) {
        return { success: false, error: data.error };
      }
      
      return { success: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send verification code';
      return { success: false, error: message };
    }
  },

  /**
   * Verify OTP for email verification
   */
  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, otp },
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data?.error) {
        return { success: false, error: data.error };
      }
      
      return { success: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify code';
      return { success: false, error: message };
    }
  },
};
