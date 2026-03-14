import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function MobileCalendarSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-10" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>

      {/* Week strip */}
      <div className="px-2 py-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <div className="flex justify-center mt-2">
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      </div>

      {/* Agenda rows */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>

            {i % 2 === 0 ? (
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2 rounded-md border border-border/60">
                  <Skeleton className="h-4 w-4 rounded-full mt-1" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ) : (
              <Skeleton className="h-4 w-20" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
