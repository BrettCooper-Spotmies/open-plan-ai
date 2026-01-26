import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { config } from '@/config';
import { logger } from '@/services/monitoring/logger';

const API_BASE_URL = config.api.baseUrl;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (reqConfig) => {
        logger.apiCall(reqConfig.method?.toUpperCase() || 'GET', reqConfig.url || '');
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          reqConfig.headers.Authorization = `Bearer ${token}`;
        }
        return reqConfig;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.apiCall(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status
        );
        return response;
      },
      (error: AxiosError) => {
        logger.error('API Error', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          message: error.message,
        });
        // Handle common errors
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token');
          // Only redirect if not already on auth pages
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        if (error.response?.status === 403) {
          console.error('Forbidden: You do not have permission to access this resource');
        }
        
        if (error.response?.status === 500) {
          console.error('Server error occurred');
        }
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
