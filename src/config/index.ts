export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Open Plan AI',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true', // Default to false for Supabase
    useSupabase: import.meta.env.VITE_USE_SUPABASE !== 'false', // Default to true for Supabase
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    errorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

export type Config = typeof config;
