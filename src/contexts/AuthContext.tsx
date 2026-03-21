import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { authService, SignUpMetadata } from '@/services/auth.service';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  initials: string;
  role: string | null;
  bio: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  pendingVerificationEmail: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requiresVerification?: boolean; email?: string }>;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      // Try by id first (migration design: profiles.id = auth.users.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, avatar_url, initials, role, bio')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) return data as Profile;

      // Fallback: try by user_id column (if DB was set up with a separate user_id)
      // user_id column exists in the actual DB but not in generated types
      const { data: data2, error: error2 } = await (supabase
        .from('profiles') as any)
        .select('id, email, name, avatar_url, initials, role, bio')
        .eq('user_id', userId)
        .maybeSingle();

      if (error2) {
        console.error('Error fetching profile:', error2);
        return null;
      }
      return data2 as Profile | null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Refresh the current user's profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  }, [user, fetchProfile]);

  // Track pending email verification for redirect
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', newSession?.user);

        // Check if user has verified email before setting auth state
        if (newSession?.user && !newSession.user.email_confirmed_at) {
          // User is not verified - don't set them as authenticated
          console.log('User email not verified, blocking auth state');
          const userEmail = newSession.user.email;
          setPendingVerificationEmail(userEmail || null);

          // Sign them out immediately
          await supabase.auth.signOut();

          // Send OTP for verification
          if (userEmail) {
            console.log('Sending OTP to:', userEmail);
            await authService.sendOtp(userEmail);
          }

          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Clear pending verification since user is verified
          setPendingVerificationEmail(null);

          // Defer profile fetch to avoid blocking
          setTimeout(async () => {
            const profileData = await fetchProfile(newSession.user.id);
            setProfile(profileData);
          }, 0);

          // Check for pending invite after successful auth
          const pendingInviteId = localStorage.getItem('pending_invite_id');
          const pendingToken = localStorage.getItem('pending_invite_token');
          if (pendingInviteId || pendingToken) {
            localStorage.removeItem('pending_invite_id');
            localStorage.removeItem('pending_invite_token');

            // Defense-in-depth: validate the stored identifier before sending to the backend.
            // The backend enforces all security rules; this prevents obviously-tampered values
            // (e.g. oversized strings) from reaching the network at all.
            const effectiveId = pendingInviteId ?? pendingToken ?? '';
            const isValidFormat =
              typeof effectiveId === 'string' &&
              effectiveId.trim().length > 0 &&
              effectiveId.length <= 500;

            if (!isValidFormat) {
              console.warn('Pending invite identifier has an invalid format; skipping accept-invite call.');
            } else if (!newSession.access_token) {
              console.error('Access token is missing. Unable to accept the invite.');
            } else {
              // Accept the invitation in the background
              supabase.functions.invoke('accept-invite', {
                headers: {
                  Authorization: `Bearer ${newSession.access_token}`,
                },
                body: pendingInviteId ? { inviteId: pendingInviteId } : { token: pendingToken },
              }).then(({ data, error }) => {
                if (error) console.error('Error accepting invite:', error);
                else if (data?.error) console.error('Invite error:', data.error);
                else console.log('Invitation accepted successfully');
              });
            }
          }
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { session: existingSession } = await authService.getSession();

        // Check if user has verified email before restoring session
        if (existingSession?.user && !existingSession.user.email_confirmed_at) {
          console.log('Existing session has unverified email, signing out');
          const userEmail = existingSession.user.email;
          setPendingVerificationEmail(userEmail || null);
          await supabase.auth.signOut();

          // Send OTP for verification
          if (userEmail) {
            console.log('Sending OTP to:', userEmail);
            await authService.sendOtp(userEmail);
          }

          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          const profileData = await fetchProfile(existingSession.user.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    if (result.error) {
      return { error: new Error(result.error.message), requiresVerification: false };
    }

    // Check if email is verified
    if (result.user && !result.user.email_confirmed_at) {
      // Sign out the user immediately since they're not verified
      await authService.signOut();

      // Send a new OTP for verification
      await authService.sendOtp(email);

      return {
        error: null,
        requiresVerification: true,
        email: email
      };
    }

    return { error: null, requiresVerification: false };
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: SignUpMetadata) => {
    const result = await authService.signUp(email, password, metadata);
    if (result.error) {
      return { error: new Error(result.error.message) };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const result = await authService.resetPassword(email);
    if (result.error) {
      return { error: new Error(result.error.message) };
    }
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to update password') };
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Soft delete the profile
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Sign out
      await authService.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete account') };
    }
  }, [user]);

  const value: AuthContextValue = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    isEmailVerified: !!user?.email_confirmed_at,
    pendingVerificationEmail,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
    updatePassword,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
