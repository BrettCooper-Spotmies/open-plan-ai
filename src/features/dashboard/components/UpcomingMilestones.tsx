import { format } from 'date-fns';
import { Flag, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Milestone } from '@/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface UpcomingMilestonesProps {
  milestones: Array<Milestone & { projectName?: string }>;
}

export function UpcomingMilestones({ milestones }: UpcomingMilestonesProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Flag className="h-4 w-4 text-chart-4" />
          Upcoming Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 md:space-y-3 px-3 md:px-6 overflow-x-hidden">
        {milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Calendar className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-medium text-foreground">No upcoming milestones</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              You don't have any milestones coming up soon.
            </p>
          </div>
        ) : (
          milestones.map((milestone) => {
            const dueDate = new Date(milestone.date);
            const isOverdue = dueDate < new Date() && !milestone.completed;
            const isUpcoming = dueDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={milestone.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors overflow-hidden',
                  milestone.completed
                    ? 'bg-muted/30 border-muted'
                    : isOverdue
                      ? 'bg-destructive/5 border-destructive/20'
                      : isUpcoming
                        ? 'bg-chart-4/5 border-chart-4/20'
                        : 'bg-card border-border'
                )}
              >
                <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'items-start justify-between')}>
                  <div className="min-w-0 flex-1">
                    <h4 className={cn(
                      'text-sm font-medium truncate max-w-full',
                      milestone.completed && 'line-through text-muted-foreground'
                    )}>
                      {milestone.title}
                    </h4>
                    {milestone.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 text-xs shrink-0',
                    isOverdue ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    <Calendar className="h-3 w-3" />
                    {format(dueDate, 'MMM d')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
