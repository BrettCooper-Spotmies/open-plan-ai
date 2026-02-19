import { format, isToday, isYesterday } from 'date-fns';

interface MessageDateDividerProps {
  date: Date;
}

export function MessageDateDivider({ date }: MessageDateDividerProps) {
  let label: string;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMM d, yyyy');

  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
