import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, 
  MessageSquare, 
  Plus, 
  Flag, 
  ArrowRight,
  AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity } from '@/types';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons = {
  task_created: Plus,
  task_completed: CheckCircle2,
  task_updated: ArrowRight,
  comment_added: MessageSquare,
  milestone_reached: Flag,
  status_changed: AlertCircle,
};

const activityColors = {
  task_created: 'text-status-in-progress bg-status-in-progress/10',
  task_completed: 'text-status-done bg-status-done/10',
  task_updated: 'text-muted-foreground bg-muted',
  comment_added: 'text-chart-2 bg-chart-2/10',
  milestone_reached: 'text-chart-4 bg-chart-4/10',
  status_changed: 'text-chart-5 bg-chart-5/10',
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          const colorClass = activityColors[activity.type];
          
          return (
            <div key={activity.id} className="flex gap-3 group">
              <div className={cn('p-2 rounded-lg shrink-0', colorClass)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-muted">
                        {activity.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">
                      {activity.user.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activity.description}
                </p>
                {activity.projectName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    in{' '}
                    <span className="font-medium text-foreground hover:underline cursor-pointer">
                      {activity.projectName}
                    </span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
