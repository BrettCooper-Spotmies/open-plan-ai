import { apiClient, tokenStorage } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

export interface SignUpMetadata {
  name?: string;
  company?: string;
  industry?: string;
}

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  initials: string | null;
  jobTitle: string | null;
  timezone: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: BackendUser;
}

export const authService = {
  async register(email: string, password: string, metadata?: SignUpMetadata): Promise<{ message: string; email: string }> {
    return apiClient.post(ENDPOINTS.AUTH.REGISTER, {
      email,
      password,
      name: metadata?.name || email.split('@')[0],
      ...(metadata?.company ? { organizationName: metadata.company } : {}),
      ...(metadata?.industry ? { industry: metadata.industry } : {}),
    });
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, { email, password });
    // The backend sets the refresh token as an httpOnly cookie.
    // We only store the short-lived access token in memory.
    tokenStorage.setAccessToken(result.accessToken);
    return result;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
      }
    } finally {
      tokenStorage.clearTokens();
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, password });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, { currentPassword, newPassword });
  },

  async sendOtp(email: string): Promise<{ message: string }> {
    return apiClient.post(ENDPOINTS.AUTH.SEND_OTP, { email });
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const result = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.VERIFY_OTP, { email, otp });
    tokenStorage.setAccessToken(result.accessToken);
    return result;
  },

  async getMe(): Promise<BackendUser> {
    return apiClient.get(ENDPOINTS.AUTH.ME);
  },

  isAuthenticated(): boolean {
    return !!tokenStorage.getAccessToken(); // in-memory access token
  },
};
