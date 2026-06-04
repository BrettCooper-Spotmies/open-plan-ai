import { appConfig } from '@/core/config';
import { logger } from '@/core/logger';

interface SentryLike {
  init(options: Record<string, unknown>): void;
  captureException(err: unknown, ctx?: Record<string, unknown>): void;
  captureMessage(msg: string, level?: string): void;
  setUser(user: { id: string; email?: string } | null): void;
  setTag(key: string, value: string): void;
  addBreadcrumb(crumb: Record<string, unknown>): void;
}

let sentry: SentryLike | null = null;

export async function initSentry(): Promise<void> {
  if (!appConfig.monitoring.enableErrorTracking || !appConfig.monitoring.sentryDsn) return;

  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn: appConfig.monitoring.sentryDsn,
      environment: appConfig.monitoring.sentryEnvironment,
      release: appConfig.app.version,
      tracesSampleRate: appConfig.isProduction ? 0.2 : 1.0,
      integrations: [Sentry.browserTracingIntegration()],
      beforeSend(event) {
        if (appConfig.isDevelopment) return null;
        return event;
      },
    });
    sentry = Sentry as unknown as SentryLike;
    logger.info('[Sentry] Initialized');
  } catch (err) {
    logger.warn('[Sentry] Failed to initialize', { err: String(err) });
  }
}

export const monitoring = {
  captureException(err: unknown, ctx?: Record<string, unknown>) {
    logger.error('[Exception]', { err: String(err), ...ctx });
    sentry?.captureException(err, ctx);
  },

  captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
    logger.info(`[Message] ${msg}`);
    sentry?.captureMessage(msg, level);
  },

  setUser(user: { id: string; email?: string } | null) {
    sentry?.setUser(user);
  },

  setTag(key: string, value: string) {
    sentry?.setTag(key, value);
  },

  breadcrumb(crumb: Record<string, unknown>) {
    sentry?.addBreadcrumb(crumb);
  },
};
