import { FolderKanban, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';


interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  progress?: {
    value: number;
    color: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'info';
}

function StatCard({ title, value, subtitle, icon, trend, progress, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-status-done',
    warning: 'text-status-blocked',
    info: 'text-status-in-progress',
  };

  return (
    <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground/80">{title}</CardTitle>
        <div className={cn('h-4 w-4 opacity-80', variantStyles[variant])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground truncate">{subtitle}</span>
          {progress && trend && (
            <div className="flex items-center gap-1 shrink-0">
              <TrendingUp className="h-3 w-3 text-status-done" />
              <span className="text-status-done font-medium">+{trend.value}%</span>
              <span className="text-muted-foreground hidden sm:inline">{trend.label}</span>
            </div>
          )}
        </div>

        {progress && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", progress.color)}
                style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
              />
            </div>
          </div>
        )}

        {!progress && trend && (
          <div className="flex items-center gap-1.5 text-xs mt-3">
            <TrendingUp className="h-3 w-3 text-status-done" />
            <span className="text-status-done font-medium">+{trend.value}%</span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  stats: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const inProgressRate = stats.totalTasks > 0 ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Projects"
        value={stats.activeProjects}
        subtitle={`${stats.totalProjects} total projects`}
        icon={<FolderKanban className="h-full w-full" />}
        variant="info"
      />
      <StatCard
        title="Tasks Completed"
        value={stats.completedTasks}
        subtitle={`of ${stats.totalTasks} tasks`}
        icon={<CheckCircle2 className="h-full w-full" />}
        progress={{ value: completionRate, color: 'bg-status-done' }}
        trend={{ value: Math.round(completionRate), label: 'completion rate' }}
        variant="success"
      />
      <StatCard
        title="In Progress"
        value={stats.inProgressTasks}
        subtitle="Current workload"
        icon={<Clock className="h-full w-full" />}
        progress={{ value: inProgressRate, color: 'bg-status-in-progress' }}
        variant="info"
      />
      <StatCard
        title="Blocked"
        value={stats.blockedTasks}
        subtitle="Issues requiring attention"
        icon={<AlertTriangle className="h-full w-full" />}
        variant="warning"
      />
    </div>
  );
}
