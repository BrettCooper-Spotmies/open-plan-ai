import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const bubbles = [
  { own: false, w: 'w-[68%] sm:w-56' },
  { own: false, w: 'w-[82%] sm:w-72' },
  { own: true, w: 'w-[74%] sm:w-64' },
  { own: true, w: 'w-[54%] sm:w-44' },
  { own: false, w: 'w-[86%] sm:w-80' },
  { own: true, w: 'w-[66%] sm:w-56' },
  { own: false, w: 'w-[60%] sm:w-48' },
  { own: true, w: 'w-[78%] sm:w-72' },
];

export function MessageAreaSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-2.5 px-3 py-3 sm:p-4 overflow-hidden">
      {bubbles.map((b, i) => (
        <div key={i} className={cn('flex items-end gap-2', b.own ? 'flex-row-reverse' : 'flex-row')}>
          {!b.own && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
          <Skeleton className={cn('h-9 sm:h-10 rounded-2xl', b.w)} />
        </div>
      ))}
    </div>
  );
}
