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
  variant?: 'default' | 'success' | 'warning' | 'info';
}

function StatCard({ title, value, subtitle, icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-status-done',
    warning: 'text-status-blocked',
    info: 'text-status-in-progress',
  };

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg bg-muted/50', variantStyles[variant])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-semibold', variantStyles[variant])}>{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs">
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
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Projects"
        value={stats.activeProjects}
        subtitle={`${stats.totalProjects} total projects`}
        icon={<FolderKanban className="h-4 w-4" />}
        variant="info"
      />
      <StatCard
        title="Tasks Completed"
        value={stats.completedTasks}
        subtitle={`of ${stats.totalTasks} total tasks`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        trend={{ value: 12, label: 'this week' }}
        variant="success"
      />
      <StatCard
        title="In Progress"
        value={stats.inProgressTasks}
        subtitle="Tasks being worked on"
        icon={<Clock className="h-4 w-4" />}
        variant="info"
      />
      <StatCard
        title="Blocked"
        value={stats.blockedTasks}
        subtitle="Tasks need attention"
        icon={<AlertTriangle className="h-4 w-4" />}
        variant="warning"
      />
    </div>
  );
}
