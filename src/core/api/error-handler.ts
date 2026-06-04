import type { AxiosError } from 'axios';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    message: string,
    code: ApiErrorCode,
    status?: number,
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }

  get isUnauthorized() { return this.code === 'UNAUTHORIZED'; }
  get isForbidden() { return this.code === 'FORBIDDEN'; }
  get isNotFound() { return this.code === 'NOT_FOUND'; }
  get isValidation() { return this.code === 'VALIDATION_ERROR'; }
  get isServer() { return this.code === 'SERVER_ERROR'; }
  get isNetwork() { return this.code === 'NETWORK_ERROR'; }
}

function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422 || status === 400) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  const axiosErr = err as AxiosError<{
    error?: { message?: string; details?: Array<{ message: string }> };
    message?: string;
  }>;

  if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ERR_NETWORK') {
    return new ApiError('Network error — please check your connection', 'NETWORK_ERROR');
  }

  if (!axiosErr.response) {
    return new ApiError(
      err instanceof Error ? err.message : 'An unexpected error occurred',
      'UNKNOWN'
    );
  }

  const { status, data, headers } = axiosErr.response;
  const requestId = headers?.['x-request-id'] as string | undefined;
  const body = data;

  const detail = body?.error?.details?.[0]?.message;
  const message =
    detail ??
    body?.error?.message ??
    body?.message ??
    `Request failed with status ${status}`;

  return new ApiError(message, statusToCode(status), status, body?.error?.details, requestId);
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
