import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  MyDayTask,
  groupTasksByProject,
  groupTasksByProgress,
  groupTasksByDueDate,
  groupTasksByPriority,
} from '@/lib/myDayUtils';
import { MyDayGroupBy, TaskStatus } from '@/types';

interface MyDayListViewProps {
  tasks: MyDayTask[];
  groupBy: MyDayGroupBy;
  onTaskClick: (task: MyDayTask) => void;
  onStatusUpdate: (taskId: string, status: TaskStatus) => void;
}

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-status-todo/20 text-muted-foreground',
  'in-progress': 'bg-status-in-progress/20 text-status-in-progress',
  review: 'bg-status-review/20 text-status-review',
  done: 'bg-status-done/20 text-status-done',
  blocked: 'bg-status-blocked/20 text-status-blocked',
};

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};

const priorityColors = {
  critical: 'bg-priority-critical/20 text-priority-critical',
  high: 'bg-priority-high/20 text-priority-high',
  medium: 'bg-priority-medium/20 text-priority-medium',
  low: 'bg-priority-low/20 text-priority-low',
};

export function MyDayListView({
  tasks,
  groupBy,
  onTaskClick,
}: MyDayListViewProps) {
  // Get all tasks in a flat list based on groupBy order
  const allTasks = useMemo((): MyDayTask[] => {
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
                  {statusLabels[task.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn('capitalize', priorityColors[task.priority])}>
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm capitalize">{task.module}</span>
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
                    {new Date(task.dueDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
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
