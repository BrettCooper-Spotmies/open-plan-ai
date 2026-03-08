import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  MessageSquare,
  Plus,
  Flag,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Activity as ActivityIcon,
  FolderPlus,
  UserPlus,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
}

type ActivityType = Activity['type'];

const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  task_created: Plus,
  task_completed: CheckCircle2,
  task_updated: ArrowRight,
  comment_added: MessageSquare,
  milestone_reached: Flag,
  status_changed: RefreshCw,
  issue_created: AlertTriangle,
  issue_resolved: CheckCircle,
  project_created: FolderPlus,
  project_updated: AlertCircle,
  project_assigned: UserPlus,
  dependency_added: GitBranch,
};

const activityColors: Record<ActivityType, string> = {
  task_created: 'text-status-in-progress bg-status-in-progress/10',
  task_completed: 'text-status-done bg-status-done/10',
  task_updated: 'text-muted-foreground bg-muted',
  comment_added: 'text-chart-2 bg-chart-2/10',
  milestone_reached: 'text-chart-4 bg-chart-4/10',
  status_changed: 'text-chart-5 bg-chart-5/10',
  issue_created: 'text-destructive bg-destructive/10',
  issue_resolved: 'text-status-done bg-status-done/10',
  project_created: 'text-primary bg-primary/10',
  project_updated: 'text-chart-3 bg-chart-3/10',
  project_assigned: 'text-chart-2 bg-chart-2/10',
  dependency_added: 'text-chart-5 bg-chart-5/10',
};

const activityLabels: Record<ActivityType, string> = {
  task_created: 'Task Created',
  task_completed: 'Task Completed',
  task_updated: 'Task Updated',
  comment_added: 'Comment',
  milestone_reached: 'Milestone',
  status_changed: 'Status Changed',
  issue_created: 'Issue Opened',
  issue_resolved: 'Issue Resolved',
  project_created: 'New Project',
  project_updated: 'Project Updated',
  project_assigned: 'Member Assigned',
  dependency_added: 'Dependency Added',
};

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Placeholder for loading state */}
          <div className="flex flex-col items-center justify-center py-8 text-center animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <ActivityIcon className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Loading activity...</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Fetching recent project updates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <ActivityIcon className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-medium text-foreground">No recent activity</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Recent project updates will appear here.
            </p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = activityIcons[activity.type] || ActivityIcon;
            const colorClass = activityColors[activity.type] || 'text-muted-foreground bg-muted';
            const label = activityLabels[activity.type] || 'Unknown Activity';

            return (
              <div
                key={activity.id}
                onClick={() => activity.projectId && navigate(`/projects/${activity.projectId}`)}
                className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors px-2 -mx-2 rounded-md"
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

                  {/* Secondary: Project name, Type badge & Timestamp row */}
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <div className="flex items-center gap-2">
                      {activity.projectName && (
                        <p className="text-xs text-muted-foreground truncate">
                          in{' '}
                          <span className="text-primary hover:underline cursor-pointer font-medium">
                            {activity.projectName}
                          </span>
                        </p>
                      )}
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        colorClass
                      )}>
                        {label}
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
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
