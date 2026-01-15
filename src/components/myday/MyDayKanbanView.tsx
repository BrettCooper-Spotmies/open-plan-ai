import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GripVertical, Check } from 'lucide-react';
import { 
  MyDayTask, 
  groupTasksByProject, 
  groupTasksByProgress, 
  groupTasksByDueDate, 
  groupTasksByPriority 
} from '@/lib/myDayUtils';
import { MyDayGroupBy, TaskStatus } from '@/types';

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  tasks: MyDayTask[];
}

interface MyDayKanbanViewProps {
  tasks: MyDayTask[];
  groupBy: MyDayGroupBy;
  onTaskClick: (task: MyDayTask) => void;
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
                                        moduleColors[task.module as keyof typeof moduleColors] || 'border-l-muted',
                                        snapshot.isDragging && 'shadow-lg rotate-2'
                                      )}
                                      onMouseEnter={() => setHoveredTask(task.id)}
                                      onMouseLeave={() => setHoveredTask(null)}
                                      onClick={() => onTaskClick(task)}
                                    >
                                      {/* Completion Checkbox */}
                                      {hoveredTask === task.id && task.status !== 'done' && (
                                        <button
                                          onClick={(e) => handleCompleteTask(task.id, e)}
                                          className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-status-done text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
                                        >
                                          <Check className="h-3 w-3" />
                                        </button>
                                      )}

                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="text-sm font-medium leading-tight text-left">
                                            {task.title}
                                          </h4>
                                          <Badge
                                            variant="secondary"
                                            className={cn(
                                              'text-[10px] px-1.5 py-0 shrink-0',
                                              priorityColors[task.priority]
                                            )}
                                          >
                                            {task.priority}
                                          </Badge>
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
                                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                              })}
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
