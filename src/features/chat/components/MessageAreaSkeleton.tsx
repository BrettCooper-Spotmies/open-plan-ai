import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const bubbles = [
  { own: false, w: 'w-48' },
  { own: false, w: 'w-64' },
  { own: true, w: 'w-56' },
  { own: true, w: 'w-40' },
  { own: false, w: 'w-72' },
  { own: true, w: 'w-52' },
  { own: false, w: 'w-44' },
  { own: true, w: 'w-60' },
];

export function MessageAreaSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
      {bubbles.map((b, i) => (
        <div key={i} className={cn('flex gap-2', b.own ? 'flex-row-reverse' : 'flex-row')}>
          {!b.own && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
          <Skeleton className={cn('h-10 rounded-2xl', b.w)} />
        </div>
      ))}
    </div>
  );
}
