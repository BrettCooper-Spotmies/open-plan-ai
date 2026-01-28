import { Skeleton } from '@/components/ui/skeleton';

export function ProjectDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-in w-full min-w-0">
      {/* Project Stats Header Skeleton */}
      <div className="flex items-center justify-between gap-6 py-4 border-y">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Skeleton className="h-2 w-24" />
          <Skeleton className="h-4 w-32" />
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Content Skeleton - Kanban-like grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="space-y-4">
            <Skeleton className="h-6 w-24 mb-4" />
            {[1, 2, 3].map((card) => (
              <Skeleton key={card} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
