import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { config } from '@/config';

const ACCESS_TOKEN_KEY = 'openplan_access_token';
const REFRESH_TOKEN_KEY = 'openplan_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Track token refresh state for queuing concurrent requests
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function onRefreshFailed() {
  refreshSubscribers = [];
}

// Extend config type to track retried requests
interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
axiosInstance.interceptors.request.use((reqConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Response interceptor — handle 401 with token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequest;

    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Skip refresh for auth endpoints to prevent loops
    if (originalRequest.url?.includes('/auth/')) {
      tokenStorage.clearTokens();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request — it will be retried once refresh completes
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
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post(`${config.api.baseUrl}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      tokenStorage.setTokens(accessToken, newRefreshToken);
      onTokenRefreshed(accessToken);
      isRefreshing = false;

      originalRequest.headers!.Authorization = `Bearer ${accessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      onRefreshFailed();
      tokenStorage.clearTokens();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  },
);

/**
 * Extract the most meaningful error message from an axios error response.
 * Priority: first details[].message → error.message → generic fallback
 */
function extractApiError(err: unknown): Error {
  const e = err as any;
  const body = e?.response?.data;
  if (body) {
    // Pick the first field-level validation detail if present
    const detail = body?.error?.details?.[0]?.message;
    if (typeof detail === 'string' && detail) {
      return Object.assign(new Error(detail), { response: e.response });
    }
    // Fall back to the top-level error message
    const msg = body?.error?.message ?? body?.message;
    if (typeof msg === 'string' && msg) {
      return Object.assign(new Error(msg), { response: e.response });
    }
  }
  // Last resort: the raw axios message
  return err instanceof Error ? err : new Error('An unexpected error occurred');
}

class ApiClient {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.get(url, config);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.post(url, data, config);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.put(url, data, config);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.patch(url, data, config);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res: AxiosResponse<{ success: boolean; data: T }> = await axiosInstance.delete(url, config);
      return res.data.data;
    } catch (err) { throw extractApiError(err); }
  }

  // Raw axios for cases where we need full response or skip the data unwrap
  get raw() { return axiosInstance; }
}

export const apiClient = new ApiClient();
