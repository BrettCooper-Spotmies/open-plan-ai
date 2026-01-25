import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  MessageSquare,
  Plus,
  Flag,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from '@/types';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  task_created: Plus,
  task_completed: CheckCircle2,
  task_updated: ArrowRight,
  comment_added: MessageSquare,
  milestone_reached: Flag,
  status_changed: AlertCircle,
  issue_created: AlertTriangle,
  issue_resolved: CheckCircle,
};

const activityColors: Record<Activity['type'], string> = {
  task_created: 'text-status-in-progress bg-status-in-progress/10',
  task_completed: 'text-status-done bg-status-done/10',
  task_updated: 'text-muted-foreground bg-muted',
  comment_added: 'text-chart-2 bg-chart-2/10',
  milestone_reached: 'text-chart-4 bg-chart-4/10',
  status_changed: 'text-chart-5 bg-chart-5/10',
  issue_created: 'text-destructive bg-destructive/10',
  issue_resolved: 'text-status-done bg-status-done/10',
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          const colorClass = activityColors[activity.type];

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0"
            >
              {/* Left: Subtle status icon */}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                colorClass
              )}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Center: Content */}
              <div className="flex-1 min-w-0">
                {/* Primary: Actor name (bold) + action text */}
                <p className="text-sm leading-snug break-words">
                  <span className="font-semibold">{activity.user.name}</span>
                  {' '}
                  <span className="text-muted-foreground text-foreground/80">{activity.description}</span>
                </p>

                {/* Secondary: Project name & Timestamp row */}
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  {activity.projectName ? (
                    <p className="text-xs text-muted-foreground truncate">
                      in{' '}
                      <span className="text-primary hover:underline cursor-pointer font-medium">
                        {activity.projectName}
                      </span>
                    </p>
                  ) : <div></div>}

                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}