import { Gauge, GitMerge, Layers, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

function StatCard({ title, value, unit, subtitle, icon, variant = 'default' }: StatCardProps) {
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
        <div className={cn('h-4 w-4 opacity-80', variantStyles[variant])}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tight tabular-nums">{value}</span>
          {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>
        <span className="mt-1 block text-xs text-muted-foreground truncate">{subtitle}</span>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  isLoading?: boolean;
  portfolio: { onTrack: number; total: number };
  eco: { open: number; awaitingMyAction: number };
  bom: { pct: number; pending: number };
  nextGate: { days: number; label: string } | null;
}

export function DashboardStats({ isLoading, portfolio, eco, bom, nextGate }: DashboardStatsProps) {
  const dash = isLoading ? '—' : undefined;
  const atRisk = portfolio.total - portfolio.onTrack;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Portfolio"
        value={dash ?? portfolio.onTrack}
        unit={`/ ${portfolio.total} on track`}
        subtitle={`${atRisk} need attention`}
        icon={<Gauge className="h-full w-full" />}
        variant={atRisk > 0 ? 'warning' : 'success'}
      />
      <StatCard
        title="Open changes"
        value={dash ?? eco.open}
        unit="ECOs"
        subtitle={`${eco.awaitingMyAction} awaiting you`}
        icon={<GitMerge className="h-full w-full" />}
        variant={eco.awaitingMyAction > 0 ? 'warning' : 'default'}
      />
      <StatCard
        title="BOM released"
        value={dash ?? bom.pct}
        unit="%"
        subtitle={`${bom.pending} parts pending`}
        icon={<Layers className="h-full w-full" />}
        variant="default"
      />
      <StatCard
        title="Next gate"
        value={dash ?? (nextGate ? nextGate.days : '—')}
        unit={nextGate ? 'days' : undefined}
        subtitle={nextGate ? nextGate.label : 'No upcoming gate'}
        icon={<Flag className="h-full w-full" />}
        variant="default"
      />
    </div>
  );
}
