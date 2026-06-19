import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { config } from '@/config';

// ─── Auth model ───────────────────────────────────────────────────────────────
//
// Backend-managed httpOnly cookies:
//   Access token  → httpOnly cookie `accessToken`  (set by backend, ~15m)
//   Refresh token → httpOnly cookie `refreshToken` (set by backend, ~7d)
//
// The browser sends both automatically (withCredentials: true). JavaScript never
// reads or stores tokens, so there is no token storage here. On a 401 the
// interceptor calls /auth/refresh (cookie sent automatically); the backend
// rotates the cookies and the original request is retried.

// ─── Refresh queue ────────────────────────────────────────────────────────────

let isRedirectingToLogin = false;
let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

function subscribeTokenRefresh(cb: () => void): void {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(): void {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
}

function onRefreshFailed(): void {
  refreshSubscribers = [];
}

function redirectToLogin(): void {
  if (!isRedirectingToLogin && !window.location.pathname.includes('/login')) {
    isRedirectingToLogin = true;
    window.location.href = '/login';
  }
}

// ─── Axios instance ───────────────────────────────────────────────────────────

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  // Required so the browser sends the httpOnly auth cookies on every request.
  withCredentials: true,
});

// Response interceptor — silent token refresh on 401.
// No Authorization header is set: the access token is an httpOnly cookie the
// browser attaches automatically.
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
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve) => {
        subscribeTokenRefresh(() => {
          originalRequest._retry = true;
          resolve(axiosInstance(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // POST /auth/refresh with NO body — the browser sends the httpOnly
      // refresh-token cookie automatically. The backend rotates both cookies.
      await axios.post(`${config.api.baseUrl}/auth/refresh`, {}, { withCredentials: true });

      isRefreshing = false;
      onTokenRefreshed();
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      onRefreshFailed();
      redirectToLogin();
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
