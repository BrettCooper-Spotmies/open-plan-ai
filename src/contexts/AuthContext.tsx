import React, { createContext, useEffect, useState, useCallback, useContext, useRef, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import { authService, SignUpMetadata } from '@/services/auth.service';
import { teamService } from '@/services/team.service';
import { supabase } from '@/integrations/supabase/client';
import { clearRecoveryFlowFlags } from '@/utils/recoveryFlowFlags';

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

/** Coalesce concurrent profile loads for the same user (INITIAL_SESSION + initializeAuth, etc.). */
function createProfileLoader(
  fetchImpl: (userId: string) => Promise<Profile | null>
): (userId: string) => Promise<Profile | null> {
  const inflight = new Map<string, Promise<Profile | null>>();
  return (userId: string) => {
    const existing = inflight.get(userId);
    if (existing) return existing;
    const p = fetchImpl(userId).finally(() => {
      inflight.delete(userId);
    });
    inflight.set(userId, p);
    return p;
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userUpdatedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      let data2: Profile | null = null;
      let error2: PostgrestError | null = null;
      try {
        // @ts-expect-error - user_id column not in generated types
        const fallbackResult = await supabase
          .from('profiles')
          .select('id, email, name, avatar_url, initials, role, bio')
          .eq('user_id', userId)
          .maybeSingle();
        
        data2 = fallbackResult.data as Profile | null;
        error2 = fallbackResult.error as PostgrestError | null;
      } catch (err) {
        error2 = err as PostgrestError | null;
      }

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

  const loadProfileDeduplicated = useMemo(() => createProfileLoader(fetchProfile), [fetchProfile]);

  // Refresh the current user's profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await loadProfileDeduplicated(user.id);
    setProfile(profileData);
  }, [user, loadProfileDeduplicated]);

  // Track pending email verification for redirect
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true; // Guard against state updates after unmount (fixes AbortError)

    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // ─── Email-verification gate ───────────────────────────────────────────
        // ONLY enforce this on the initial sign-in events.
        // TOKEN_REFRESHED, USER_UPDATED, etc. must NOT trigger a sign-out because
        // the refreshed JWT may not include `email_confirmed_at` in its payload,
        // which would incorrectly log out a fully verified user every few minutes.
        const isInitialSignIn = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
        const onPasswordResetPage =
          typeof globalThis.window !== 'undefined' &&
          globalThis.window.location.pathname === '/reset-password';
        const allowPasswordRecovery =
          event === 'PASSWORD_RECOVERY' || (isInitialSignIn && onPasswordResetPage);

        if (
          isInitialSignIn &&
          newSession?.user &&
          !newSession.user.email_confirmed_at &&
          !allowPasswordRecovery
        ) {
          console.warn('User email not verified, blocking auth state');
          const userEmail = newSession.user.email;
          if (mounted) setPendingVerificationEmail(userEmail || null);

          // Sign them out immediately
          await supabase.auth.signOut();

          // Send OTP for verification
          if (userEmail) {
            console.warn('Sending OTP to:', userEmail);
            await authService.sendOtp(userEmail);
          }

          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          return;
        }

        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Clear pending verification since user is verified
          setPendingVerificationEmail(null);

          // Only refetch profile when user/session meaningfully changes — not on every
          // TOKEN_REFRESHED (fires often and caused continuous /profiles traffic).
          const shouldRefetchProfileImmediate =
            event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'PASSWORD_RECOVERY';

          const userIdForProfile = newSession.user.id;
          const scheduleUserUpdatedProfileFetch = () => {
            if (userUpdatedDebounceRef.current) {
              clearTimeout(userUpdatedDebounceRef.current);
            }
            userUpdatedDebounceRef.current = setTimeout(() => {
              userUpdatedDebounceRef.current = null;
              if (!mounted) return;
              loadProfileDeduplicated(userIdForProfile).then((profileData) => {
                if (mounted) setProfile(profileData);
              }).catch((err) => {
                if (mounted) console.error('Error fetching profile after USER_UPDATED:', err);
              });
            }, 600);
          };

          if (shouldRefetchProfileImmediate) {
            loadProfileDeduplicated(userIdForProfile).then((profileData) => {
              if (mounted) setProfile(profileData);
            }).catch((err) => {
              if (mounted) console.error('Error fetching profile after auth change:', err);
            });
          } else if (event === 'USER_UPDATED') {
            scheduleUserUpdatedProfileFetch();
          }

          // Check for pending invite after successful auth
          const pendingInviteId = localStorage.getItem('pending_invite_id');
          const pendingToken = localStorage.getItem('pending_invite_token');
          if (pendingInviteId || pendingToken) {
            const effectiveId = pendingInviteId ?? pendingToken ?? '';
            const isValidFormat =
              typeof effectiveId === 'string' &&
              effectiveId.trim().length > 0 &&
              effectiveId.length <= 500;

            if (!isValidFormat) {
              console.warn('Pending invite identifier has an invalid format; skipping accept-invite call.');
              localStorage.removeItem('pending_invite_id');
              localStorage.removeItem('pending_invite_token');
            } else if (!newSession.access_token) {
              console.error('Access token is missing. Unable to accept the invite.');
            } else {
              teamService.acceptInvitation(effectiveId)
                .then(() => {
                  console.warn('Invitation accepted successfully');
                  localStorage.removeItem('pending_invite_id');
                  localStorage.removeItem('pending_invite_token');
                })
                .catch((inviteError) => {
                  console.error('Error accepting invite:', inviteError);
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
        if (!mounted) return;

        // Check if user has verified email before restoring session
        const onPasswordResetPageInit =
          typeof globalThis.window !== 'undefined' &&
          globalThis.window.location.pathname === '/reset-password';

        if (
          existingSession?.user &&
          !existingSession.user.email_confirmed_at &&
          !onPasswordResetPageInit
        ) {
          console.warn('Existing session has unverified email, signing out');
          const userEmail = existingSession.user.email;
          if (mounted) setPendingVerificationEmail(userEmail || null);
          await supabase.auth.signOut();

          // Send OTP for verification
          if (userEmail && mounted) {
            console.warn('Sending OTP to:', userEmail);
            await authService.sendOtp(userEmail);
          }

          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsLoading(false);
          }
          return;
        }

        if (!mounted) return;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          const profileData = await loadProfileDeduplicated(existingSession.user.id);
          if (mounted) setProfile(profileData);
        }
      } catch (error) {
        if (mounted) console.error('Error initializing auth:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (userUpdatedDebounceRef.current) {
        clearTimeout(userUpdatedDebounceRef.current);
        userUpdatedDebounceRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [loadProfileDeduplicated]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    if (result.error) {
      return { error: new Error(result.error.message), requiresVerification: false };
    }

    // Check if email is verified
    if (result.user && !result.user.email_confirmed_at) {
      clearRecoveryFlowFlags();
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

    clearRecoveryFlowFlags();
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
    clearRecoveryFlowFlags();
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
      // Soft delete the profile row first so RLS still applies during the call.
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Permanently delete the auth user via a SECURITY DEFINER edge function.
      // This removes the user from auth.users so the email can be re-used
      // and the account is truly gone.
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.access_token) {
        const { error: deleteAuthErr } = await supabase.functions.invoke('delete-auth-user', {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        });
        if (deleteAuthErr) {
          console.error('Failed to delete auth user — profile is soft-deleted:', deleteAuthErr);
          // Non-fatal: profile is inaccessible; proceed with sign-out.
        }
      }

      // Sign out locally.
      await authService.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete account') };
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
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
    }),
    [
      user,
      profile,
      session,
      isLoading,
      pendingVerificationEmail,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
      updatePassword,
      deleteAccount,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
