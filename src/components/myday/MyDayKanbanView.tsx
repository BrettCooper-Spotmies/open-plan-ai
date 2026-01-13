import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MyDayTaskCard } from './MyDayTaskCard';
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
  { id: 'dependency', label: 'Dependency', color: 'bg-destructive' },
  { id: 'notStarted', label: 'Not Started', color: 'bg-muted-foreground' },
  { id: 'inProgress', label: 'In Progress', color: 'bg-status-inProgress' },
  { id: 'completed', label: 'Completed', color: 'bg-status-done' },
];

const dueDateColumnConfig = [
  { id: 'late', label: 'Late', color: 'bg-destructive' },
  { id: 'today', label: 'Today', color: 'bg-priority-high' },
  { id: 'tomorrow', label: 'Tomorrow', color: 'bg-priority-medium' },
  { id: 'thisWeek', label: 'This Week', color: 'bg-status-inProgress' },
  { id: 'later', label: 'Later', color: 'bg-muted-foreground' },
];

const priorityColumnConfig = [
  { id: 'urgent', label: 'Urgent', color: 'bg-priority-critical' },
  { id: 'important', label: 'Important', color: 'bg-priority-high' },
  { id: 'medium', label: 'Medium', color: 'bg-priority-medium' },
  { id: 'low', label: 'Low', color: 'bg-priority-low' },
];

function getTaskVariant(task: MyDayTask): 'attention' | 'ready' | 'blocked' {
  if (task.isBlocked || task.hasUnresolvedDependencies) return 'blocked';
  if (task.isOverdue || task.isDueToday || task.priority === 'critical' || task.priority === 'high') return 'attention';
  return 'ready';
}

export function MyDayKanbanView({
  tasks,
  groupBy,
  onTaskClick,
  onStatusUpdate,
  onChecklistToggle,
}: MyDayKanbanViewProps) {
  const columns = useMemo((): KanbanColumn[] => {
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-320px)]">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-[320px]">
            <Card className="h-full bg-card/50 border-border">
              {/* Column Header */}
              <div className="p-3 border-b border-border flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', column.color)} />
                <h3 className="font-medium text-sm text-foreground">{column.label}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {column.tasks.length}
                </Badge>
              </div>

              {/* Column Content */}
              <Droppable droppableId={column.id} isDropDisabled={groupBy !== 'progress'}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'p-2 space-y-2 min-h-[200px] transition-colors',
                      snapshot.isDraggingOver && 'bg-accent/50'
                    )}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                        isDragDisabled={groupBy !== 'progress'}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'transition-shadow',
                              snapshot.isDragging && 'shadow-lg'
                            )}
                          >
                            <MyDayTaskCard
                              task={task}
                              variant={getTaskVariant(task)}
                              onTaskClick={onTaskClick}
                              onStatusUpdate={onStatusUpdate}
                              onChecklistToggle={onChecklistToggle}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {/* Empty State */}
                    {column.tasks.length === 0 && (
                      <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                        No tasks
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </Card>
          </div>
        ))}

        {/* Empty State for no columns */}
        {columns.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No tasks to display
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
