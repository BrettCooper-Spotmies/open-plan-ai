import { logger } from '@/core/logger';
import { appConfig } from '@/core/config';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export async function initWebVitals(): Promise<void> {
  if (!appConfig.isProduction) return;

  try {
    const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');

    const report = (metric: WebVitalMetric) => {
      logger.info(`[Vitals] ${metric.name}`, { value: metric.value, rating: metric.rating });
    };

    onCLS(report);
    onINP(report);
    onFCP(report);
    onLCP(report);
    onTTFB(report);
  } catch { /* web-vitals is optional */ }
}

export function measureRender(componentName: string): () => void {
  if (!appConfig.isDevelopment) return () => {};
  const start = performance.now();
  return () => {
    const dur = performance.now() - start;
    if (dur > 16) logger.debug(`[Render] ${componentName} took ${dur.toFixed(1)}ms`);
  };
}
