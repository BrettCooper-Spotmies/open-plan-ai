import { memo, useMemo, useCallback } from 'react';
import { Flag, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MilestoneHealthItem } from '../utils/reportsUtils';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ReportMilestoneHealthProps {
  data: MilestoneHealthItem[];
  onMilestoneClick?: (milestoneId: string) => void;
}

const statusConfig = {
  'on-track': {
    label: 'On Track',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    badgeVariant: 'outline' as const,
    badgeClass: 'border-emerald-500 text-emerald-600',
  },
  'at-risk': {
    label: 'At Risk',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    badgeVariant: 'outline' as const,
    badgeClass: 'border-amber-500 text-amber-600',
  },
  'blocked': {
    label: 'Blocked',
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    badgeVariant: 'destructive' as const,
    badgeClass: '',
  },
  'complete': {
    label: 'Complete',
    icon: CheckCircle2,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeVariant: 'secondary' as const,
    badgeClass: '',
  },
};

export const ReportMilestoneHealth = memo(function ReportMilestoneHealth({ data, onMilestoneClick }: ReportMilestoneHealthProps) {
  const sortedData = useMemo(() => [...data].sort((a, b) => {
    const order = { 'blocked': 0, 'at-risk': 1, 'on-track': 2, 'complete': 3 };
    return order[a.status] - order[b.status];
  }), [data]);

  const handleMilestoneClick = useCallback((milestoneId: string) => {
    onMilestoneClick?.(milestoneId);
  }, [onMilestoneClick]);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Flag className="h-4 w-4" />
          Milestone Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No milestones to display
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {sortedData.map((item) => {
              const config = statusConfig[item.status];
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={item.milestone.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                    item.status === 'complete' && "opacity-60"
                  )}
                  onClick={() => handleMilestoneClick(item.milestone.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded", config.bgColor)}>
                        <StatusIcon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.milestone.title}</p>
                        {item.milestone.date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(item.milestone.date), 'MMM dd, yyyy')}
                            {item.daysRemaining > 0 && ` (${item.daysRemaining}d left)`}
                            {item.daysRemaining < 0 && item.status !== 'complete' && (
                              <span className="text-destructive"> (overdue)</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={config.badgeVariant}
                      className={cn("text-xs", config.badgeClass)}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {item.completedTasks}/{item.totalTasks} tasks ({item.progress}%)
                      </span>
                    </div>
                    <Progress value={item.progress} className="h-1.5" />
                    
                    {item.overdueTasks > 0 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {item.overdueTasks} overdue task{item.overdueTasks > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
