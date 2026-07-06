import { useMemo } from 'react';
import { format, parse } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { resolveFileUrl } from '@/utils/fileUrl';
import { CheckSquare, Bug, Check } from 'lucide-react';
import {
  MyDayItem,
  groupTasksByProject,
  groupTasksByProgress,
  groupTasksByDueDate,
  groupTasksByPriority,
} from '../utils/myDayUtils';
import { MyDayGroupBy, TaskStatus } from '@/types';

interface MyDayListViewProps {
  tasks: MyDayItem[];
  groupBy: MyDayGroupBy;
  onTaskClick: (item: MyDayItem) => void;
  onStatusUpdate: (taskId: string, status: TaskStatus) => void;
}

const statusColors: Record<string, string> = {
  todo: 'bg-status-todo/20 text-muted-foreground',
  'in-progress': 'bg-status-in-progress/20 text-status-in-progress',
  review: 'bg-status-review/20 text-status-review',
  done: 'bg-status-done/20 text-status-done',
  blocked: 'bg-status-blocked/20 text-status-blocked',
  // Issue statuses
  open: 'bg-destructive/20 text-destructive',
  resolved: 'bg-status-done/20 text-status-done',
  'wont-fix': 'bg-muted-foreground/20 text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  todo: 'Todo',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
  // Issue statuses
  open: 'Open',
  resolved: 'Resolved',
  'wont-fix': "Won't Fix",
};

const priorityColors: Record<string, string> = {
  critical: 'bg-priority-critical/20 text-priority-critical',
  high: 'bg-priority-high/20 text-priority-high',
  medium: 'bg-priority-medium/20 text-priority-medium',
  low: 'bg-priority-low/20 text-priority-low',
  // Issue severities
  major: 'bg-orange-500/20 text-orange-600',
  minor: 'bg-yellow-500/20 text-yellow-700',
  trivial: 'bg-muted-foreground/20 text-muted-foreground',
};

export function MyDayListView({
  tasks,
  groupBy,
  onTaskClick,
}: MyDayListViewProps) {
  // Get all tasks in a flat list based on groupBy order
  const allTasks = useMemo((): MyDayItem[] => {
    switch (groupBy) {
      case 'project': {
        const grouped = groupTasksByProject(tasks);
        return Array.from(grouped.values()).flatMap(data => data.tasks);
      }
      case 'progress': {
        const grouped = groupTasksByProgress(tasks);
        return [
          ...grouped.dependency,
          ...grouped.notStarted,
          ...grouped.inProgress,
          ...grouped.completed,
        ];
      }
      case 'dueDate': {
        const grouped = groupTasksByDueDate(tasks);
        return [
          ...grouped.late,
          ...grouped.today,
          ...grouped.tomorrow,
          ...grouped.thisWeek,
          ...grouped.later,
        ];
      }
      case 'priority': {
        const grouped = groupTasksByPriority(tasks);
        return [
          ...grouped.urgent,
          ...grouped.important,
          ...grouped.medium,
          ...grouped.low,
        ];
      }
      default:
        return tasks;
    }
  }, [tasks, groupBy]);

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Type</TableHead>
            <TableHead className="w-[300px]">Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Assigned By</TableHead>
            <TableHead>Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allTasks.map((task) => (
            <TableRow
              key={task.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onTaskClick(task)}
            >
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 flex items-center gap-1 w-fit',
                    task.itemType === 'task' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                  )}
                >
                  {task.itemType === 'task' ? (
                    <>
                      <CheckSquare className="h-3 w-3" />
                      <span>Task</span>
                    </>
                  ) : (
                    <>
                      <Bug className="h-3 w-3" />
                      <span>Issue</span>
                    </>
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-start gap-2">
                  {(task.status === 'done' || task.status === 'resolved') && (
                    <div className="h-4 w-4 rounded-full bg-status-done/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-status-done" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="font-medium line-clamp-2 cursor-pointer">{task.title}</p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {task.title}
                      </TooltipContent>
                    </Tooltip>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn('capitalize', statusColors[task.status])}>
                  {statusLabels[task.status] || task.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn('capitalize', priorityColors[task.priority])}>
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm capitalize">{task.itemType === 'task' && task.originalTask?.module ? task.originalTask.module : '-'}</span>
              </TableCell>
              <TableCell>
                {task.projectName ? (
                  <Badge variant="outline" className="text-xs">
                    {task.projectName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                {(() => {
                  const assignedBy = task.itemType === 'task' ? task.originalTask?.createdBy : task.originalIssue?.reportedBy;
                  return assignedBy ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={resolveFileUrl(assignedBy.avatar) ?? assignedBy.avatar} alt={assignedBy.name} />
                        <AvatarFallback className="text-[10px]">
                          {assignedBy.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{assignedBy.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  );
                })()}
              </TableCell>
              <TableCell>
                {task.dueDate ? (
                  <span className="text-sm">
                    {format(new Date(task.dueDate), 'dd/MM/yyyy')}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">No date</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
