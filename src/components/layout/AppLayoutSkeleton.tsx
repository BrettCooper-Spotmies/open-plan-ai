import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';

interface AppLayoutSkeletonProps {
  variant?: 'dashboard' | 'list' | 'detail' | 'default';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page title */}
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with title and action button */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* List rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Main content card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-6">
          {/* Section 1 */}
          <div>
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <Skeleton className="h-5 w-28 mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>

          {/* Section 3 */}
          <div>
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded border">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DefaultPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page title */}
      <div>
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Generic content blocks */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}

export function AppLayoutSkeleton({ variant = 'default' }: AppLayoutSkeletonProps) {
  return (
    <AppLayout>
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'list' && <ListPageSkeleton />}
      {variant === 'detail' && <DetailPageSkeleton />}
      {variant === 'default' && <DefaultPageSkeleton />}
    </AppLayout>
  );
}
