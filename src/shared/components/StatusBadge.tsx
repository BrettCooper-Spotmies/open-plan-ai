import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked' | 'open' | 'resolved' | 'closed';

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  todo: { label: 'To Do', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  review: { label: 'Review', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  done: { label: 'Done', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  open: { label: 'Open', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: '' };
  return (
    <Badge variant="secondary" className={cn(cfg.className, 'capitalize', className)}>
      {cfg.label}
    </Badge>
  );
}
