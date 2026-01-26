import { memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import { TeamWorkloadItem } from '../utils/reportsUtils';

interface ReportTeamWorkloadProps {
  data: TeamWorkloadItem[];
  onMemberClick?: (memberId: string) => void;
}

export const ReportTeamWorkload = memo(function ReportTeamWorkload({ data, onMemberClick }: ReportTeamWorkloadProps) {
  const chartData = useMemo(() => data.map(item => ({
    name: item.member.name.split(' ')[0],
    fullName: item.member.name,
    initials: item.member.initials,
    memberId: item.member.id,
    total: item.totalTasks,
    overdue: item.overdueTasks,
    regular: item.totalTasks - item.overdueTasks,
    completed: item.completedTasks,
    inProgress: item.inProgressTasks,
  })), [data]);
  
  const maxTasks = useMemo(() => Math.max(...data.map(d => d.totalTasks), 1), [data]);

  const handleMemberClick = useCallback((memberId: string) => {
    onMemberClick?.(memberId);
  }, [onMemberClick]);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No workload data to display
          </div>
        ) : (
          <div className="space-y-3">
            {chartData.slice(0, 6).map((member) => (
              <div 
                key={member.memberId}
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors"
                onClick={() => handleMemberClick(member.memberId)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{member.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {member.total} tasks
                      {member.overdue > 0 && (
                        <span className="text-destructive ml-1">({member.overdue} overdue)</span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex gap-0.5 h-2 w-full">
                    {member.completed > 0 && (
                      <div 
                        className="bg-emerald-500 rounded-l-full first:rounded-l-full"
                        style={{ width: `${(member.completed / maxTasks) * 100}%` }}
                        title={`${member.completed} completed`}
                      />
                    )}
                    {member.inProgress > 0 && (
                      <div 
                        className="bg-blue-500"
                        style={{ width: `${(member.inProgress / maxTasks) * 100}%` }}
                        title={`${member.inProgress} in progress`}
                      />
                    )}
                    {(member.total - member.completed - member.inProgress) > 0 && (
                      <div 
                        className="bg-muted"
                        style={{ width: `${((member.total - member.completed - member.inProgress) / maxTasks) * 100}%` }}
                        title={`${member.total - member.completed - member.inProgress} remaining`}
                      />
                    )}
                    {member.overdue > 0 && (
                      <div 
                        className="bg-destructive rounded-r-full"
                        style={{ width: `${(member.overdue / maxTasks) * 100}%` }}
                        title={`${member.overdue} overdue`}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Completed
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                In Progress
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                To Do
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                Overdue
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
