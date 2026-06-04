import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CanceledError } from 'axios';
import { appConfig } from '@/core/config';
import { applyRequestInterceptors, applyResponseInterceptors } from './interceptors';
import { normalizeError } from './error-handler';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeout,
  headers: { 'Content-Type': 'application/json' },
});

applyRequestInterceptors(axiosInstance);
applyResponseInterceptors(axiosInstance);

type ApiResponse<T> = { success: boolean; data: T; meta?: Record<string, unknown> };

class ApiClient {
  private extractData<T>(res: AxiosResponse<ApiResponse<T>>): T {
    return res.data.data;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.get<ApiResponse<T>>(url, config);
      return this.extractData(res);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.post<ApiResponse<T>>(url, data, config);
      return this.extractData(res);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.put<ApiResponse<T>>(url, data, config);
      return this.extractData(res);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
      return this.extractData(res);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.delete<ApiResponse<T>>(url, config);
      return this.extractData(res);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  createCancelToken() {
    const controller = new AbortController();
    return {
      signal: controller.signal,
      cancel: () => controller.abort(),
    };
  }

  isCanceled(err: unknown): boolean {
    return err instanceof CanceledError || axios.isCancel(err);
  }

  get raw(): AxiosInstance {
    return axiosInstance;
  }
}

export const apiClient = new ApiClient();
