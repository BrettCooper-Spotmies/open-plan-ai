import { Skeleton } from '@/components/ui/skeleton';

export function ProjectDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-in w-full min-w-0">
      {/* Project Stats Header Skeleton */}
      <div className="flex items-center justify-between gap-6 py-4 border-y">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="h-8 w-16" /> {/* Back button */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" /> {/* Title */}
            <Skeleton className="h-6 w-20 rounded-full" /> {/* Stage badge */}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Skeleton className="h-4 w-32" /> {/* Progress popover */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" /> {/* Calendar icon */}
            <Skeleton className="h-4 w-24" /> {/* Due Date text */}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" /> {/* Users icon */}
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-6 rounded-full border-2 border-background" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Skeleton className="h-8 w-[200px] rounded-md" />
          </div>
          {/* View Toggle */}
          <Skeleton className="h-8 w-[72px] rounded-lg" />
          {/* Filter Dropdown */}
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Content Skeleton - Kanban flex row */}
      <div className="w-full overflow-hidden mt-2">
        <div className="inline-flex gap-4 w-full">
          {[1, 2, 3, 4, 5].map((col) => (
            <div key={col} className="w-[280px] flex-shrink-0 flex flex-col space-y-4">
              {/* Column Header */}
              <div className="flex items-center gap-2 px-1">
                <Skeleton className="h-4 w-4" /> {/* grip icon */}
                <Skeleton className="h-2 w-2 rounded-full" /> {/* dot */}
                <Skeleton className="h-4 w-24" /> {/* label */}
                <Skeleton className="h-3 w-4 ml-1" /> {/* count */}
              </div>
              
              {/* Skeleton Cards */}
              {[1, 2].map((card) => (
                <div key={card} className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded border border-border" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
