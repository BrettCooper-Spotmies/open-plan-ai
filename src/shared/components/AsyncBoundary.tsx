import React, { Suspense } from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AsyncBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

function DefaultErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div>
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

export function AsyncBoundary({
  children,
  fallback = <div className="h-full w-full animate-pulse bg-muted" />,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  onError,
}: AsyncBoundaryProps) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback} onError={onError}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ReactErrorBoundary>
  );
}
