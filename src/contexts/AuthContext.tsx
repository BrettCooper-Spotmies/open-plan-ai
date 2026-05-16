import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { authService, BackendUser, SignUpMetadata } from '@/services/auth.service';
import { apiClient, tokenStorage } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

interface AuthContextValue {
  user: BackendUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requiresVerification?: boolean; email?: string }>;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Initialize auth state from stored token
  useEffect(() => {
    const init = async () => {
      const accessToken = tokenStorage.getAccessToken();
      if (!accessToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authService.getMe();
        setUser(me);
      } catch {
        tokenStorage.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const me = await authService.getMe();
      setUser(me);
    } catch {
      // ignore — token may have expired, interceptor handles redirect
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      setPendingVerificationEmail(null);
      return { error: null };
    } catch (err: unknown) {
      // Check if the error is an unverified email response (403)
      const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (axiosErr?.response?.status === 403) {
        const msg = axiosErr.response?.data?.error?.message || '';
        if (msg === 'email_not_verified') {
          // Backend auto-sends OTP on this 403 — just flag the state
          setPendingVerificationEmail(email);
          return { error: null, requiresVerification: true, email };
        }
      }
      const message = err instanceof Error ? err.message : 'Login failed';
      return { error: new Error(message) };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: SignUpMetadata) => {
    try {
      await authService.register(email, password, metadata);
      // Backend auto-sends OTP on register
      setPendingVerificationEmail(email);
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { error: new Error(message) };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setPendingVerificationEmail(null);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.forgotPassword(email);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to send reset email') };
    }
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to update password') };
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await apiClient.delete(ENDPOINTS.USERS.ME);
      await signOut();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete account') };
    }
  }, [signOut]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified ?? false,
    pendingVerificationEmail,
    setPendingVerificationEmail,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    deleteAccount,
  }), [user, isLoading, pendingVerificationEmail, signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
