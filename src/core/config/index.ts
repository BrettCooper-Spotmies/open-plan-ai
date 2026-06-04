import { env } from './env';

export const appConfig = {
  app: {
    name: env.VITE_APP_NAME,
    version: env.VITE_APP_VERSION,
  },
  api: {
    baseUrl: env.VITE_API_BASE_URL,
    wsUrl: env.VITE_WS_URL,
    timeout: 15_000,
    retryCount: 2,
  },
  auth: {
    accessTokenKey: 'openplan_access_token',
    refreshTokenKey: 'openplan_refresh_token',
    tokenRefreshThreshold: 60_000,
  },
  monitoring: {
    sentryDsn: env.VITE_SENTRY_DSN,
    sentryEnvironment: env.VITE_SENTRY_ENVIRONMENT,
    otelEndpoint: env.VITE_OTEL_ENDPOINT,
    enableErrorTracking: env.VITE_ENABLE_ERROR_TRACKING,
    enableAnalytics: env.VITE_ENABLE_ANALYTICS,
  },
  featureFlags: {
    raw: env.VITE_FEATURE_FLAGS,
  },
  isDevelopment: env.MODE === 'development',
  isProduction: env.MODE === 'production',
  isStaging: env.MODE === 'staging',
  isTest: env.MODE === 'test',
} as const;

export type AppConfig = typeof appConfig;
export { env };
