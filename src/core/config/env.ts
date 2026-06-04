import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_NAME: z.string().default('Open Plan AI'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3001/api/v1'),
  VITE_WS_URL: z.string().default('http://localhost:3001'),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_ENABLE_ANALYTICS: z.string().transform((v) => v === 'true').default('false'),
  VITE_ENABLE_ERROR_TRACKING: z.string().transform((v) => v === 'true').default('false'),
  VITE_OTEL_ENDPOINT: z.string().optional(),
  VITE_FEATURE_FLAGS: z.string().optional(),
  MODE: z.enum(['development', 'staging', 'production', 'test']).default('development'),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse({
    ...import.meta.env,
    MODE: import.meta.env.MODE,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error('[Config] Invalid environment variables:', errors);
    if (import.meta.env.PROD) {
      throw new Error(`Invalid environment configuration: ${JSON.stringify(errors)}`);
    }
  }

  return result.success ? result.data : (import.meta.env as unknown as Env);
}

export const env = validateEnv();
