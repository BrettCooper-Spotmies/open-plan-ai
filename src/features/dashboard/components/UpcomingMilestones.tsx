import { format } from 'date-fns';
import { Flag, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Milestone } from '@/types';
import { cn } from '@/lib/utils';

interface UpcomingMilestonesProps {
  milestones: Array<Milestone & { projectName?: string }>;
}

export function UpcomingMilestones({ milestones }: UpcomingMilestonesProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Flag className="h-4 w-4 text-chart-4" />
          Upcoming Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming milestones
          </p>
        ) : (
          milestones.map((milestone) => {
            const dueDate = new Date(milestone.date);
            const isOverdue = dueDate < new Date() && !milestone.completed;
            const isUpcoming = dueDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={milestone.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  milestone.completed
                    ? 'bg-muted/30 border-muted'
                    : isOverdue
                    ? 'bg-destructive/5 border-destructive/20'
                    : isUpcoming
                    ? 'bg-chart-4/5 border-chart-4/20'
                    : 'bg-card border-border'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className={cn(
                      'text-sm font-medium',
                      milestone.completed && 'line-through text-muted-foreground'
                    )}>
                      {milestone.title}
                    </h4>
                    {milestone.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
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
