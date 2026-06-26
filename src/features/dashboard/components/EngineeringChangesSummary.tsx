import { Link } from 'react-router-dom';
import { ArrowRight, GitMerge, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrgEcoAggregate, useOrgEcoStatusCounts, useOrgAwaitingEcos } from '../hooks/useOrgAggregates';
import { MAIN_STATUSES, STATUS_LABEL, statusMeta, type ECOStatus } from '@/features/projects/components/ecoData';
import type { ApiEcoListItem } from '@/hooks/useECOs';
import { PanelIcon } from './PanelIcon';

interface EngineeringChangesSummaryProps {
  projectIds: string[];
}

function StageBar({ status, count, max }: { status: ECOStatus; count: number; max: number }) {
  const meta = statusMeta(status);
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 text-xs text-muted-foreground truncate">{STATUS_LABEL[status]}</span>
      <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: max ? `${(count / max) * 100}%` : '0%', minWidth: count ? 5 : 0, background: meta.color }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums">{count}</span>
    </div>
  );
}

export function EngineeringChangesSummary({ projectIds }: EngineeringChangesSummaryProps) {
  const { isLoading: aggLoading, open, firstPassPct, avgCycleDays } = useOrgEcoAggregate(projectIds);
  const { isLoading: statusLoading, ecos } = useOrgEcoStatusCounts(projectIds);
  const { isLoading: awaitingLoading, awaiting } = useOrgAwaitingEcos(projectIds);

  const counts = MAIN_STATUSES.map((s) => ({
    status: s,
    count: ecos.filter((e: ApiEcoListItem) => e.status.toUpperCase() === s).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));

  const isLoading = aggLoading || statusLoading;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="px-3 py-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <PanelIcon icon={GitMerge} color="#9333EA" />
          Engineering Changes
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects" className="text-muted-foreground hover:text-foreground">
            Open ECOs
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="grid grid-cols-3 gap-0 rounded-lg border border-border overflow-hidden">
          <div className="flex flex-col gap-0.5 px-3 py-2.5">
            <span className="text-[10.5px] font-medium text-muted-foreground">Open</span>
            <span className="text-lg font-bold tabular-nums">{isLoading ? '—' : open}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-3 py-2.5 border-l border-border">
            <span className="text-[10.5px] font-medium text-muted-foreground">First-pass</span>
            <span className="text-lg font-bold tabular-nums text-status-done">
              {isLoading ? '—' : firstPassPct == null ? '—' : `${firstPassPct}%`}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-3 py-2.5 border-l border-border">
            <span className="text-[10.5px] font-medium text-muted-foreground">Avg cycle</span>
            <span className="text-lg font-bold tabular-nums">
              {isLoading ? '—' : avgCycleDays == null ? '—' : `${avgCycleDays}d`}
            </span>
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
            Pipeline by stage
          </span>
          <div className="space-y-2">
            {counts.map((c) => (
              <StageBar key={c.status} status={c.status} count={c.count} max={max} />
            ))}
          </div>
        </div>

        {!awaitingLoading && awaiting.length > 0 && (
          <div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-status-blocked mb-2.5">
              <GitPullRequest className="h-3 w-3" />
              Awaiting your approval
            </span>
            <div className="space-y-1.5">
              {awaiting.map((eco) => (
                <Link
                  key={eco.id}
                  to={`/projects/${eco.projectId}/eng-changes`}
                  className="flex items-center gap-2.5 rounded-lg border border-status-blocked/30 bg-status-blocked/[0.07] px-3 py-2 text-sm hover:bg-status-blocked/[0.12] transition-colors"
                >
                  <span className="font-mono text-[11px] font-semibold text-status-blocked shrink-0">{eco.num}</span>
                  <span className="flex-1 min-w-0 truncate">{eco.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
