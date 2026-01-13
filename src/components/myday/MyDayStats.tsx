import { AlertTriangle, PlayCircle, Lock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MyDayStatsProps {
  attentionCount: number;
  readyCount: number;
  blockedCount: number;
  completedTodayCount: number;
}

interface StatCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  variant: 'attention' | 'ready' | 'blocked' | 'completed';
}

function StatCard({ title, count, icon, variant }: StatCardProps) {
  const variantStyles = {
    attention: 'border-destructive/30 bg-destructive/5',
    ready: 'border-status-done/30 bg-status-done/5',
    blocked: 'border-muted bg-muted/30',
    completed: 'border-primary/30 bg-primary/5',
  };

  const iconStyles = {
    attention: 'text-destructive',
    ready: 'text-status-done',
    blocked: 'text-muted-foreground',
    completed: 'text-primary',
  };

  return (
    <Card className={cn('border', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
          </div>
          <div className={cn('p-2 rounded-lg bg-background/50', iconStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MyDayStats({
  attentionCount,
  readyCount,
  blockedCount,
  completedTodayCount,
}: MyDayStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Needs Attention"
        count={attentionCount}
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="attention"
      />
      <StatCard
        title="Ready to Work"
        count={readyCount}
        icon={<PlayCircle className="h-5 w-5" />}
        variant="ready"
      />
      <StatCard
        title="Blocked"
        count={blockedCount}
        icon={<Lock className="h-5 w-5" />}
        variant="blocked"
      />
      <StatCard
        title="Completed Today"
        count={completedTodayCount}
        icon={<CheckCircle2 className="h-5 w-5" />}
        variant="completed"
      />
    </div>
  );
}
