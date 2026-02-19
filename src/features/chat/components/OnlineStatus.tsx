import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function OnlineStatus({ isOnline, size = 'sm', className }: OnlineStatusProps) {
  return (
    <span
      className={cn(
        'rounded-full border-2 border-background',
        isOnline ? 'bg-green-500' : 'bg-muted-foreground/40',
        size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
        className
      )}
    />
  );
}
