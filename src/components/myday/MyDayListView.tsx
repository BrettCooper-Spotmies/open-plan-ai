import { useMemo } from 'react';
import { ChevronDown, ChevronRight, Calendar, Lock, Link2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  MyDayTask,
  groupTasksByProject,
  groupTasksByProgress,
  groupTasksByDueDate,
  groupTasksByPriority,
  getModuleInfo,
  getPriorityInfo,
  formatDueDate,
  getDueDateStatus,
} from '@/lib/myDayUtils';
import { MyDayGroupBy, TaskStatus } from '@/types';
import { useState } from 'react';

interface ListGroup {
  id: string;
  label: string;
  color: string;
  tasks: MyDayTask[];
}

interface MyDayListViewProps {
  tasks: MyDayTask[];
  groupBy: MyDayGroupBy;
  onTaskClick: (task: MyDayTask) => void;
  onStatusUpdate: (taskId: string, status: TaskStatus) => void;
}

const progressLabels: Record<string, { label: string; color: string }> = {
  dependency: { label: 'Dependency', color: 'bg-destructive' },
  notStarted: { label: 'Not Started', color: 'bg-muted-foreground' },
  inProgress: { label: 'In Progress', color: 'bg-status-inProgress' },
  completed: { label: 'Completed', color: 'bg-status-done' },
};

const dueDateLabels: Record<string, { label: string; color: string }> = {
  late: { label: 'Late', color: 'bg-destructive' },
  today: { label: 'Today', color: 'bg-priority-high' },
  tomorrow: { label: 'Tomorrow', color: 'bg-priority-medium' },
  thisWeek: { label: 'This Week', color: 'bg-status-inProgress' },
  later: { label: 'Later', color: 'bg-muted-foreground' },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-priority-critical' },
  important: { label: 'Important', color: 'bg-priority-high' },
  medium: { label: 'Medium', color: 'bg-priority-medium' },
  low: { label: 'Low', color: 'bg-priority-low' },
};

const statusColors: Record<TaskStatus, string> = {
  'todo': 'bg-status-todo text-foreground',
  'in-progress': 'bg-status-inProgress text-white',
  'review': 'bg-status-review text-white',
  'done': 'bg-status-done text-white',
  'blocked': 'bg-status-blocked text-white',
};

export function MyDayListView({
  tasks,
  groupBy,
  onTaskClick,
  onStatusUpdate,
}: MyDayListViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  const groups = useMemo((): ListGroup[] => {
    switch (groupBy) {
      case 'project': {
        const grouped = groupTasksByProject(tasks);
        return Array.from(grouped.entries()).map(([id, { name, tasks }]) => ({
          id,
          label: name,
          color: 'bg-primary',
          tasks,
        }));
      }
      case 'progress': {
        const grouped = groupTasksByProgress(tasks);
        return Object.entries(grouped).map(([key, tasks]) => ({
          id: key,
          ...progressLabels[key],
          tasks,
        }));
      }
      case 'dueDate': {
        const grouped = groupTasksByDueDate(tasks);
        return Object.entries(grouped).map(([key, tasks]) => ({
          id: key,
          ...dueDateLabels[key],
          tasks,
        }));
      }
      case 'priority': {
        const grouped = groupTasksByPriority(tasks);
        return Object.entries(grouped).map(([key, tasks]) => ({
          id: key,
          ...priorityLabels[key],
          tasks,
        }));
      }
      default:
        return [];
    }
  }, [tasks, groupBy]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Initialize all groups as expanded
  useMemo(() => {
    setExpandedGroups(new Set(groups.map(g => g.id)));
  }, [groupBy]);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Collapsible
          key={group.id}
          open={expandedGroups.has(group.id)}
          onOpenChange={() => toggleGroup(group.id)}
        >
          {/* Group Header */}
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-lg transition-colors">
            {expandedGroups.has(group.id) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div className={cn('w-2 h-2 rounded-full', group.color)} />
            <span className="font-medium text-sm">{group.label}</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              {group.tasks.length}
            </Badge>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {group.tasks.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden mt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[300px]">Task</TableHead>
                      <TableHead className="w-[150px]">Project</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead className="w-[100px]">Priority</TableHead>
                      <TableHead className="w-[120px]">Due Date</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[80px]">Assignee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.tasks.map((task) => {
                      const moduleInfo = getModuleInfo(task.module);
                      const priorityInfo = getPriorityInfo(task.priority);
                      const dueDateStatus = getDueDateStatus(task.dueDate);
                      
                      return (
                        <TableRow 
                          key={task.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onTaskClick(task)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {task.isBlocked && (
                                <Lock className="h-3 w-3 text-status-blocked shrink-0" />
                              )}
                              {task.isBlockingOthers && !task.isBlocked && (
                                <Link2 className="h-3 w-3 text-priority-high shrink-0" />
                              )}
                              <span className="font-medium text-sm truncate">
                                {task.title}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {task.projectName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs', moduleInfo.color)}>
                              {moduleInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs', priorityInfo.color)}>
                              {priorityInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={cn(
                              'flex items-center gap-1 text-xs',
                              dueDateStatus === 'overdue' && 'text-destructive',
                              dueDateStatus === 'today' && 'text-priority-high',
                            )}>
                              <Calendar className="h-3 w-3" />
                              <span>{formatDueDate(task.dueDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={task.status}
                              onValueChange={(value: TaskStatus) => onStatusUpdate(task.id, value)}
                            >
                              <SelectTrigger className="h-7 w-[100px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="blocked">Blocked</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {task.assignee && (
                              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium">
                                {task.assignee.initials}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tasks in this group
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Empty State */}
      {groups.length === 0 || groups.every(g => g.tasks.length === 0) && (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          No tasks to display
        </div>
      )}
    </div>
  );
}
