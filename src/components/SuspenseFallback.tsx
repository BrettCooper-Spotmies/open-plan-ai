import { Loader2 } from 'lucide-react';

interface SuspenseFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export function SuspenseFallback({ 
  message = 'Loading...', 
  fullScreen = false 
}: SuspenseFallbackProps) {
  const containerClass = fullScreen 
    ? 'min-h-screen' 
    : 'min-h-[200px]';

  return (
    <div className={`${containerClass} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

// Skeleton loader for cards
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
      <div className="h-3 bg-muted rounded w-1/2 mb-2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  );
}

// Skeleton loader for list items
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card animate-pulse">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for KPI cards
export function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-muted" />
            <div className="h-4 bg-muted rounded w-24" />
          </div>
          <div className="h-8 bg-muted rounded w-16 mb-1" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      ))}
    </div>
  );
}

// Skeleton for charts
export function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-5 bg-muted rounded w-40 mb-4" />
      <div className="h-[200px] bg-muted rounded" />
    </div>
  );
}
