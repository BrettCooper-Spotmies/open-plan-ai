import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import { appConfig } from '@/core/config';
import { normalizeError } from './error-handler';

const { accessTokenKey, refreshTokenKey } = appConfig.auth;

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(accessTokenKey),
  getRefreshToken: (): string | null => localStorage.getItem(refreshTokenKey),
  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(accessTokenKey, accessToken);
    localStorage.setItem(refreshTokenKey, refreshToken);
  },
  clearTokens: (): void => {
    localStorage.removeItem(accessTokenKey);
    localStorage.removeItem(refreshTokenKey);
  },
};

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let isRedirectingToLogin = false;
let refreshQueue: Array<(token: string) => void> = [];

function drainQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

function rejectQueue() {
  refreshQueue = [];
}

const SKIP_REFRESH_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/send-otp',
  '/auth/verify-otp',
];

function redirectToLogin() {
  if (!isRedirectingToLogin && !window.location.pathname.includes('/login')) {
    isRedirectingToLogin = true;
    tokenStorage.clearTokens();
    window.location.href = '/login';
  }
}

export function applyRequestInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-App-Version'] = appConfig.app.version;
    return config;
  });
}

export function applyResponseInterceptors(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const original = error.config as RetryableRequest;

      if (!error.response || error.response.status !== 401 || original._retry) {
        return Promise.reject(normalizeError(error));
      }

      const shouldSkip = SKIP_REFRESH_PATHS.some((p) => original.url?.includes(p));
      if (shouldSkip) {
        redirectToLogin();
        return Promise.reject(normalizeError(error));
      }

      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve) => {
          refreshQueue.push((newToken) => {
            original.headers!.Authorization = `Bearer ${newToken}`;
            original._retry = true;
            resolve(instance(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${appConfig.api.baseUrl}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        tokenStorage.setTokens(accessToken, newRefreshToken);
        drainQueue(accessToken);
        isRefreshing = false;
        isRedirectingToLogin = false;

        original.headers!.Authorization = `Bearer ${accessToken}`;
        return instance(original);
      } catch (refreshErr) {
        isRefreshing = false;
        rejectQueue();
        redirectToLogin();
        return Promise.reject(normalizeError(refreshErr));
      }
    }
  );
}
