import { useMemo } from 'react';
import { format, parse } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CheckSquare, Bug } from 'lucide-react';
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
  investigating: 'bg-orange-500/20 text-orange-600',
  resolved: 'bg-status-done/20 text-status-done',
  closed: 'bg-muted-foreground/20 text-muted-foreground',
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
  investigating: 'Investigating',
  resolved: 'Resolved',
  closed: 'Closed',
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
            <TableHead>Assignee</TableHead>
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
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {task.description}
                    </p>
                  )}
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
                {task.assignees && task.assignees.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {task.assignees[0].initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {task.assignees[0].name}
                      {task.assignees.length > 1 && ` +${task.assignees.length - 1}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                {task.dueDate ? (
                  <span className="text-sm">
                    {format(parse(task.dueDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
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
