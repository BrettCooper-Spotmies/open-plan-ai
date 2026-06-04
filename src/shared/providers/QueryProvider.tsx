import { QueryClient, QueryCache, MutationCache, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { logger } from '@/core/logger';
import { monitoring } from '@/core/monitoring';
import { appConfig } from '@/core/config';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const key = JSON.stringify(query.queryKey);
      logger.error(`Query failed: ${key}`, { error: String(error) });
      monitoring.captureException(error, { queryKey: key });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      logger.error('Mutation failed', { error: String(error) });
      monitoring.captureException(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

export { queryClient };

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {appConfig.isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
