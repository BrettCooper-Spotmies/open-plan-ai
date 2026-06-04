import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { config } from '@/config';

// ─── Token Storage ────────────────────────────────────────────────────────────
//
// SECURITY MODEL:
//   Access token  → in-memory only (never touches storage, invisible to XSS)
//   Refresh token → httpOnly cookie (set by the backend, unreadable by JS)
//
// On hard refresh the access token is gone, so the app calls /auth/refresh on
// mount. The browser automatically sends the httpOnly cookie; the backend
// validates it and returns a fresh access token in the JSON body.
//
// This pattern eliminates localStorage-based token theft via XSS.

let _accessToken: string | null = null;

export const tokenStorage = {
  getAccessToken: (): string | null => _accessToken,

  setAccessToken: (token: string): void => {
    _accessToken = token;
  },

  // The refresh token lives in an httpOnly cookie — the browser manages it.
  // These stubs exist so call-sites that previously called setTokens / clearTokens
  // continue to compile without changes until each is updated individually.
  setTokens: (accessToken: string, _refreshToken: string): void => {
    _accessToken = accessToken;
    // _refreshToken is now set by the backend via Set-Cookie — ignore it here.
  },

  clearTokens: (): void => {
    _accessToken = null;
    // The httpOnly cookie is cleared by calling POST /auth/logout on the backend,
    // which responds with Set-Cookie: refreshToken=; Max-Age=0; HttpOnly
  },

  // Legacy alias — kept for backwards compat during migration
  getRefreshToken: (): null => null,
};

// ─── Refresh queue ────────────────────────────────────────────────────────────

let isRedirectingToLogin = false;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function onRefreshFailed(): void {
  refreshSubscribers = [];
}

// ─── Axios instance ───────────────────────────────────────────────────────────

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  // Required so the browser sends the httpOnly refresh cookie cross-origin.
  withCredentials: true,
});

// Request interceptor — attach access token from memory
axiosInstance.interceptors.request.use((reqConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Response interceptor — silent token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequest;

    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Skip refresh for auth endpoints to avoid infinite loops
    const skipRefreshUrls = [
      '/auth/refresh',
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/send-otp',
      '/auth/verify-otp',
    ];
    const shouldSkipRefresh = skipRefreshUrls.some((ep) => originalRequest.url?.includes(ep));

    if (shouldSkipRefresh) {
      tokenStorage.clearTokens();
      if (!isRedirectingToLogin && !window.location.pathname.includes('/login')) {
        isRedirectingToLogin = true;
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve) => {
        subscribeTokenRefresh((newToken) => {
          originalRequest.headers!.Authorization = `Bearer ${newToken}`;
          originalRequest._retry = true;
          resolve(axiosInstance(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // POST /auth/refresh with NO body — the browser sends the httpOnly
      // refresh-token cookie automatically via withCredentials: true.
      const response = await axios.post(
        `${config.api.baseUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const { accessToken } = response.data.data;

      tokenStorage.setAccessToken(accessToken);
      onTokenRefreshed(accessToken);
      isRefreshing = false;

      originalRequest.headers!.Authorization = `Bearer ${accessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      onRefreshFailed();
      tokenStorage.clearTokens();
      if (!isRedirectingToLogin && !window.location.pathname.includes('/login')) {
        isRedirectingToLogin = true;
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  },
);

// ─── Error extraction ─────────────────────────────────────────────────────────

function extractApiError(err: unknown): Error {
  const e = err as {
    response?: {
      data?: {
        error?: { details?: Array<{ message?: string }>; message?: string };
        message?: string;
      };
    };
    message?: string;
  };

  const body = e?.response?.data;
  if (body) {
    const detail = body?.error?.details?.[0]?.message;
    if (typeof detail === 'string' && detail) {
      return Object.assign(new Error(detail), { response: (err as { response?: unknown }).response });
    }
    const msg = body?.error?.message ?? body?.message;
    if (typeof msg === 'string' && msg) {
      return Object.assign(new Error(msg), { response: (err as { response?: unknown }).response });
    }
  }
  return err instanceof Error ? err : new Error('An unexpected error occurred');
}

// ─── ApiClient ────────────────────────────────────────────────────────────────

class ApiClient {
  async get<T>(url: string, cfg?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.get(url, cfg);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async post<T>(url: string, data?: unknown, cfg?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.post(url, data, cfg);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async put<T>(url: string, data?: unknown, cfg?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.put(url, data, cfg);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async patch<T>(url: string, data?: unknown, cfg?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.patch(url, data, cfg);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async delete<T>(url: string, cfg?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.delete(url, cfg);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  get raw() { return axiosInstance; }
}

export const apiClient = new ApiClient();
