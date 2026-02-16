import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GripVertical, Check, CheckSquare, Bug } from 'lucide-react';
import {
  MyDayItem,
  groupTasksByProject,
  groupTasksByProgress,
  groupTasksByDueDate,
  groupTasksByPriority
} from '../utils/myDayUtils';
import { MyDayGroupBy, TaskStatus } from '@/types';

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  tasks: MyDayItem[];
}

interface MyDayKanbanViewProps {
  tasks: MyDayItem[];
  groupBy: MyDayGroupBy;
  onTaskClick: (item: MyDayItem) => void;
  onStatusUpdate: (taskId: string, status: TaskStatus) => void;
  onChecklistToggle: (taskId: string, itemId: string) => void;
}

const progressColumnConfig = [
  { id: 'dependency', label: 'Dependency', color: 'bg-status-blocked' },
  { id: 'notStarted', label: 'Not Started', color: 'bg-status-todo' },
  { id: 'inProgress', label: 'In Progress', color: 'bg-status-in-progress' },
  { id: 'completed', label: 'Completed', color: 'bg-status-done' },
];

const dueDateColumnConfig = [
  { id: 'late', label: 'Late', color: 'bg-status-blocked' },
  { id: 'today', label: 'Today', color: 'bg-priority-high' },
  { id: 'tomorrow', label: 'Tomorrow', color: 'bg-priority-medium' },
  { id: 'thisWeek', label: 'This Week', color: 'bg-status-in-progress' },
  { id: 'later', label: 'Later', color: 'bg-status-todo' },
];

const priorityColumnConfig = [
  { id: 'urgent', label: 'Urgent', color: 'bg-priority-critical' },
  { id: 'important', label: 'Important', color: 'bg-priority-high' },
  { id: 'medium', label: 'Medium', color: 'bg-priority-medium' },
  { id: 'low', label: 'Low', color: 'bg-priority-low' },
];

const priorityColors = {
  critical: 'bg-priority-critical text-white',
  high: 'bg-priority-high text-white',
  medium: 'bg-priority-medium text-white',
  low: 'bg-priority-low text-white',
};

const moduleColors = {
  hardware: 'border-l-module-hardware',
  software: 'border-l-module-software',
  firmware: 'border-l-module-firmware',
  testing: 'border-l-module-testing',
};

export function MyDayKanbanView({
  tasks,
  groupBy,
  onTaskClick,
  onStatusUpdate,
}: MyDayKanbanViewProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const columns = useMemo((): KanbanColumn[] => {
    switch (groupBy) {
      case 'project': {
        const grouped = groupTasksByProject(tasks);
        return Array.from(grouped.entries()).map(([id, { name, tasks }], index) => ({
          id,
          label: name,
          color: `bg-chart-${(index % 5) + 1}`,
          tasks,
        }));
      }
      case 'progress': {
        const grouped = groupTasksByProgress(tasks);
        return progressColumnConfig.map(config => ({
          ...config,
          tasks: grouped[config.id as keyof typeof grouped] || [],
        }));
      }
      case 'dueDate': {
        const grouped = groupTasksByDueDate(tasks);
        return dueDateColumnConfig.map(config => ({
          ...config,
          tasks: grouped[config.id as keyof typeof grouped] || [],
        }));
      }
      case 'priority': {
        const grouped = groupTasksByPriority(tasks);
        return priorityColumnConfig.map(config => ({
          ...config,
          tasks: grouped[config.id as keyof typeof grouped] || [],
        }));
      }
      default:
        return [];
    }
  }, [tasks, groupBy]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Only allow status updates when grouping by progress
    if (groupBy === 'progress' && source.droppableId !== destination.droppableId) {
      const statusMap: Record<string, TaskStatus> = {
        dependency: 'blocked',
        notStarted: 'todo',
        inProgress: 'in-progress',
        completed: 'done',
      };

      const newStatus = statusMap[destination.droppableId];
      if (newStatus) {
        onStatusUpdate(draggableId, newStatus);
      }
    }
  };

  const handleCompleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusUpdate(taskId, 'done');
  };

  if (columns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="COLUMN" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="w-full max-w-full overflow-x-auto pb-4"
            >
              <div
                className="inline-flex gap-4 min-w-full"
                style={{
                  width: 'max-content',
                }}
              >
                {columns.map((column, index) => (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          'w-[280px] flex-shrink-0 space-y-3 transition-shadow',
                          snapshot.isDragging && 'shadow-lg'
                        )}
                      >
                        {/* Column Header - Sticky */}
                        <div className="sticky top-0 bg-background z-10 pb-3 space-y-3">
                          <div className="flex items-center gap-2 px-1">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className={cn('w-2 h-2 rounded-full', column.color)} />
                            <h3 className="font-medium text-sm">{column.label}</h3>
                            <span className="text-xs text-muted-foreground">
                              {column.tasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Tasks Droppable */}
                        <Droppable droppableId={column.id} type="TASK" isDropDisabled={groupBy !== 'progress'}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                'space-y-2 min-h-[200px] p-2 rounded-lg transition-colors',
                                snapshot.isDraggingOver ? 'bg-muted/50' : 'bg-muted/30'
                              )}
                            >
                              {column.tasks.map((task, taskIndex) => (
                                <Draggable
                                  key={task.id}
                                  draggableId={task.id}
                                  index={taskIndex}
                                  isDragDisabled={groupBy !== 'progress'}
                                >
                                  {(provided, snapshot) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        'p-3 cursor-grab active:cursor-grabbing border-l-4 relative group hover:shadow-md transition-shadow',
                                        task.itemType === 'task' && task.originalTask?.module
                                          ? moduleColors[task.originalTask.module as keyof typeof moduleColors] || 'border-l-muted'
                                          : 'border-l-muted',
                                        snapshot.isDragging && 'shadow-lg rotate-2'
                                      )}
                                      onMouseEnter={() => setHoveredTask(task.id)}
                                      onMouseLeave={() => setHoveredTask(null)}
                                      onClick={() => onTaskClick(task)}
                                    >
                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="relative flex flex-1 items-start min-w-0 overflow-hidden">
                                            {task.status !== 'done' && task.status !== 'resolved' && task.status !== 'closed' && (
                                              <div
                                                className={cn(
                                                  "absolute left-0 top-0 z-10 flex items-center justify-center w-4 h-4 transition-all duration-300 ease-out",
                                                  hoveredTask === task.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
                                                )}
                                              >
                                                <button
                                                  onClick={(e) => handleCompleteTask(task.id, e)}
                                                  className="h-4 w-4 rounded-full border border-foreground/30 flex items-center justify-center hover:border-foreground hover:bg-muted transition-all bg-background"
                                                >
                                                  <Check className="h-3 w-3 text-foreground" />
                                                </button>
                                              </div>
                                            )}
                                            <h4
                                              className={cn(
                                                "text-sm font-medium leading-tight truncate transition-all duration-300 ease-out",
                                                task.status !== 'done' && task.status !== 'resolved' && task.status !== 'closed' && hoveredTask === task.id ? "translate-x-6" : "translate-x-0"
                                              )}
                                            >
                                              {task.title}
                                            </h4>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {/* Item Type Badge */}
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                'text-[9px] px-1 py-0 h-4 flex items-center gap-0.5',
                                                task.itemType === 'task' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                                              )}
                                            >
                                              {task.itemType === 'task' ? (
                                                <>
                                                  <CheckSquare className="h-2.5 w-2.5" />
                                                  <span>Task</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Bug className="h-2.5 w-2.5" />
                                                  <span>Issue</span>
                                                </>
                                              )}
                                            </Badge>
                                            {/* Priority Badge */}
                                            <Badge
                                              variant="secondary"
                                              className={cn(
                                                'text-[10px] px-1.5 py-0',
                                                priorityColors[task.priority as keyof typeof priorityColors]
                                              )}
                                            >
                                              {task.priority}
                                            </Badge>
                                          </div>
                                        </div>

                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2 text-left">
                                            {task.description}
                                          </p>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                          {task.assignees && task.assignees.length > 0 && (
                                            <Avatar className="h-5 w-5">
                                              <AvatarFallback className="text-[9px] bg-muted">
                                                {task.assignees[0].initials}
                                              </AvatarFallback>
                                            </Avatar>
                                          )}
                                          {task.dueDate && (
                                            <span className="text-[10px] text-muted-foreground">
                                              {format(parseISO(task.dueDate), 'MMM d')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
