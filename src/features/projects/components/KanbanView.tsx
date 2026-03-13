import { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus, Priority, ModuleType, Issue } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Plus, Check, GripVertical, X, AlertTriangle, Link2, Calendar as CalendarIcon, Maximize2 } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTeamMembers } from '@/hooks/useProjects';
import { format } from 'date-fns';
import { TaskDetailModal } from './TaskDetailModal';

// Utility function to convert Date to YYYY-MM-DD format (date-only, no timezone shift)
const toDateOnly = (date: Date | undefined | null): string | undefined => {
  if (!date) return undefined;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface KanbanColumn {
  id: string;
  status: TaskStatus | string;
  label: string;
  color: string;
  isSpecial?: boolean; // For Dependencies bucket
}

interface KanbanViewProps {
  tasks: Task[];
  allTasks?: Task[]; // All tasks for dependency resolution
  issues?: Issue[]; // Issues for blocking indicator
  onTaskCreate?: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  modules?: { id: string; name: string; type: ModuleType }[];
  projectId?: string;
  onAddModule?: () => void;
}

const defaultColumns: KanbanColumn[] = [
  { id: 'col-dependencies', status: 'blocked', label: 'Dependencies', color: 'bg-status-blocked', isSpecial: true },
  { id: 'col-todo', status: 'todo', label: 'To Do', color: 'bg-status-todo' },
  { id: 'col-in-progress', status: 'in-progress', label: 'In Progress', color: 'bg-status-in-progress' },
  { id: 'col-review', status: 'review', label: 'Review', color: 'bg-status-review' },
  { id: 'col-done', status: 'done', label: 'Done', color: 'bg-status-done' },
];

const priorityColors = {
  critical: 'bg-priority-critical text-white',
  high: 'bg-priority-high text-white',
  medium: 'bg-priority-medium text-white',
  low: 'bg-priority-low text-white',
};

const moduleColors: Record<string, string> = {
  hardware: 'border-l-module-hardware',
  software: 'border-l-module-software',
  firmware: 'border-l-module-firmware',
  testing: 'border-l-module-testing',
  design: 'border-l-chart-1',
  procurement: 'border-l-chart-2',
  manufacturing: 'border-l-chart-3',
  qa: 'border-l-chart-4',
  logistics: 'border-l-chart-5',
  enclosure: 'border-l-muted-foreground',
  pcb: 'border-l-primary',
  power: 'border-l-destructive',
};

const columnColorOptions = [
  { value: 'bg-status-todo', label: 'Gray' },
  { value: 'bg-status-in-progress', label: 'Blue' },
  { value: 'bg-status-review', label: 'Purple' },
  { value: 'bg-status-done', label: 'Green' },
  { value: 'bg-status-blocked', label: 'Red' },
  { value: 'bg-chart-4', label: 'Yellow' },
];

export function KanbanView({ tasks: initialTasks, allTasks, issues = [], onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  modules = [],
  projectId,
  onAddModule,
}: KanbanViewProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Sync local state with props when they change
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskToColumn, setAddTaskToColumn] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('bg-status-todo');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMaximizedAddTask, setIsMaximizedAddTask] = useState(false);
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
  const [isModulePopoverOpen, setIsModulePopoverOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    module: 'software' as ModuleType,
    assignees: [],
    startDate: toDateOnly(new Date()),
    tags: [],
    status: 'todo',
    blockedBy: [],
    moduleIds: [],
  });

  // Initial state for new task has no module pre-selected by default
  // This allows the "Select Module" placeholder to show up

  // Fetch real team members
  const { data: teamMembers = [] } = useTeamMembers();

  // Determine which tasks are blocked
  const blockedTaskIds = useMemo(() => {
    const blocked = new Set<string>();
    const allTasksToCheck = allTasks || tasks;

    tasks.forEach(task => {
      // Check if blocked by other tasks
      if (task.blockedBy && task.blockedBy.length > 0) {
        const hasUnresolvedBlocker = task.blockedBy.some(blockerId => {
          const blocker = allTasksToCheck.find(t => t.id === blockerId);
          return blocker && blocker.status !== 'done';
        });
        if (hasUnresolvedBlocker) {
          blocked.add(task.id);
        }
      }

      // Check if blocked by issues
      if (task.linkedIssueIds && task.linkedIssueIds.length > 0) {
        const hasBlockingIssue = task.linkedIssueIds.some(issueId => {
          const issue = issues.find(i => i.id === issueId);
          return issue && issue.status !== 'resolved' && issue.status !== 'closed';
        });
        if (hasBlockingIssue) {
          blocked.add(task.id);
        }
      }
    });

    return blocked;
  }, [tasks, allTasks, issues]);

  // Get blocking info for a task
  const getBlockingInfo = (task: Task) => {
    const blockers: string[] = [];
    const allTasksToCheck = allTasks || tasks;

    if (task.blockedBy) {
      task.blockedBy.forEach(blockerId => {
        const blocker = allTasksToCheck.find(t => t.id === blockerId);
        if (blocker && blocker.status !== 'done') {
          blockers.push(`Task: ${blocker.title}`);
        }
      });
    }

    if (task.linkedIssueIds) {
      task.linkedIssueIds.forEach(issueId => {
        const issue = issues.find(i => i.id === issueId);
        if (issue && issue.status !== 'resolved' && issue.status !== 'closed') {
          blockers.push(`Issue: ${issue.title}`);
        }
      });
    }

    return blockers;
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    // Optimistic local state update
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));

    // Call backend mutation if available
    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }

    // Only update selected task if it's the one currently being viewed
    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, type, draggableId } = result;

    if (!destination) return;

    // If dropped in the same place
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Dragging columns
    if (type === 'COLUMN') {
      const newColumns = Array.from(columns);
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);
      setColumns(newColumns);
      return;
    }

    // Prevent dragging INTO the Dependencies bucket (it's auto-populated)
    const destColumn = columns.find(col => col.id === destination.droppableId);
    if (destColumn?.isSpecial && destColumn.status === 'blocked') {
      return;
    }

    const sourceColumn = columns.find(col => col.id === source.droppableId);

    if (!sourceColumn || !destColumn) return;

    // Get the task being moved
    const movedTask = tasks.find(t => t.id === draggableId);
    if (!movedTask) return;

    // Update task status if moved to different column
    const updatedTask = {
      ...movedTask,
      status: destColumn.status as TaskStatus,
    };

    // Optimistic local state update
    const newTasks = tasks.map(t =>
      t.id === movedTask.id ? updatedTask : t
    );
    setTasks(newTasks);

    // Call backend mutation if available
    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, status: 'done' as TaskStatus };
    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    } else {
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;

    const newColumn: KanbanColumn = {
      id: `col-${Date.now()}`,
      status: newColumnName.toLowerCase().replace(/\s+/g, '-'),
      label: newColumnName,
      color: newColumnColor,
    };

    setColumns([...columns, newColumn]);
    setNewColumnName('');
    setNewColumnColor('bg-status-todo');
    setIsAddColumnOpen(false);
  };

  const handleRemoveColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    // Don't allow removing special columns or columns with tasks
    if (column?.isSpecial) return;
    if (column && tasks.some(t => t.status === column.status && !blockedTaskIds.has(t.id))) {
      return;
    }
    setColumns(columns.filter(c => c.id !== columnId));
  };

  const handleAddTask = (taskOverride?: Partial<Task>) => {
    const taskData = taskOverride || newTask;
    if (!taskData.title?.trim()) return;

    // Determine status: explicit or from column
    let status = taskData.status as TaskStatus;
    if (addTaskToColumn) {
      const column = columns.find(c => c.id === addTaskToColumn);
      if (column && !column.isSpecial) {
        status = column.status as TaskStatus;
      }
    }

    // Create task data for backend
    const taskToCreate = {
      title: taskData.title || '',
      description: taskData.description || '',
      status: status || 'todo',
      priority: taskData.priority || 'medium',
      module: taskData.module || 'software',
      moduleId: taskData.moduleId,
      moduleIds: taskData.moduleIds || [],
      // dependencies: taskData.dependencies || [], (Deprecated)
      blockedBy: taskData.blockedBy || [],
      tags: taskData.tags || [],
      assignees: taskData.assignees || [],
      startDate: taskData.startDate,
      dueDate: taskData.dueDate,
      checklist: taskData.checklist || [],
    };

    // Call backend mutation if available
    if (onTaskCreate) {
      onTaskCreate(taskToCreate as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
    } else {
      // Fallback to local state update for mock mode
      const task: Task = {
        ...taskToCreate,
        id: `task-${Date.now()}`,
        comments: [],
        attachments: [],
        linkedIssueIds: [],
        moduleId: modules.length > 0 ? modules[0].id : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks([...tasks, task]);
    }

    // Reset form state
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      module: 'software',
      assignees: [],
      startDate: toDateOnly(new Date()),
      tags: [],
      status: 'todo',
      blockedBy: [],
      moduleIds: [],
    });
    setIsAddTaskOpen(false);
    setIsMaximizedAddTask(false);
    setAddTaskToColumn(null);
  };

  const handleMaximizeAddTask = () => {
    setIsAddTaskOpen(false);
    setIsMaximizedAddTask(true);
    setAddTaskToColumn(null);
  };

  const openAddTaskDialog = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.isSpecial) return; // Can't add tasks to Dependencies bucket
    setAddTaskToColumn(columnId);
    setNewTask(prev => ({ ...prev, status: column?.status as TaskStatus || 'todo' }));
    setIsAddTaskOpen(true);
  };

  // Get tasks for a column, considering blocked tasks go to Dependencies
  const getColumnTasks = (column: KanbanColumn) => {
    if (column.isSpecial && column.status === 'blocked') {
      // Dependencies bucket shows blocked tasks
      return tasks.filter(t => blockedTaskIds.has(t.id) && t.status !== 'done');
    }
    // Regular columns show non-blocked tasks with that status
    return tasks.filter(t => t.status === column.status && !blockedTaskIds.has(t.id));
  };

  return (
    <div className="space-y-4">
      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="COLUMN" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="w-full overflow-x-auto pb-4"
            >
              <div
                className="inline-flex gap-4 min-w-full"
                style={{
                  width: 'max-content',
                }}
              >
                {columns.map((column, index) => {
                  const columnTasks = getColumnTasks(column);
                  const isDependenciesColumn = column.isSpecial && column.status === 'blocked';

                  return (
                    <Draggable
                      key={column.id}
                      draggableId={column.id}
                      index={index}
                      isDragDisabled={column.isSpecial}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            'w-[280px] flex-shrink-0 flex flex-col transition-shadow',
                            'max-h-[calc(100vh-220px)]',
                            snapshot.isDragging && 'shadow-lg'
                          )}
                        >
                          {/* Column Header - stays at top */}
                          <div className="flex-shrink-0 bg-background pb-3 space-y-3">
                            <div className="flex items-center gap-2 px-1">
                              {!column.isSpecial && (
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              {column.isSpecial && <div {...provided.dragHandleProps} />}
                              {isDependenciesColumn ? (
                                <Link2 className="h-4 w-4 text-status-blocked" />
                              ) : (
                                <div className={cn('w-2 h-2 rounded-full', column.color)} />
                              )}
                              <h3 className={cn(
                                'font-medium text-sm',
                                isDependenciesColumn && 'text-status-blocked'
                              )}>
                                {column.label}
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                {columnTasks.length}
                              </span>
                              {!column.isSpecial && columnTasks.length === 0 && columns.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 ml-auto opacity-50 hover:opacity-100"
                                  onClick={() => handleRemoveColumn(column.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            {/* Add Task Button at Top - not shown for Dependencies */}
                            {!isDependenciesColumn && (
                              <div className="px-2">
                                <Button
                                  variant="ghost"
                                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                                  onClick={() => {
                                    setAddTaskToColumn(column.id);
                                    setNewTask(prev => ({ ...prev, status: column?.status as TaskStatus || 'todo' }));
                                    setIsMaximizedAddTask(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Task
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Tasks Droppable - scrollable area */}
                          <div className="flex-1 overflow-y-auto min-h-0">
                            <Droppable
                              droppableId={column.id}
                              type="TASK"
                              isDropDisabled={isDependenciesColumn}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={cn(
                                    'space-y-2 min-h-[120px] p-2 rounded-lg transition-colors',
                                    snapshot.isDraggingOver
                                      ? 'bg-muted/50'
                                      : 'bg-muted/30'
                                  )}
                                >
                                  {columnTasks.map((task, taskIndex) => {
                                    const isBlocked = blockedTaskIds.has(task.id);
                                    const blockingInfo = isBlocked ? getBlockingInfo(task) : [];

                                    return (
                                      <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                        {(provided, snapshot) => (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Card
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  className={cn(
                                                    'p-3 cursor-grab active:cursor-grabbing border-l-4 relative group hover:shadow-md transition-shadow',
                                                    moduleColors[task.module] || 'border-l-muted',
                                                    snapshot.isDragging && 'shadow-lg rotate-2'
                                                  )}
                                                  onMouseEnter={() => setHoveredTask(task.id)}
                                                  onMouseLeave={() => setHoveredTask(null)}
                                                  onClick={() => handleTaskClick(task)}
                                                >


                                                  <div className="space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="relative flex flex-1 items-start min-w-0 overflow-hidden">
                                                        {isBlocked ? (
                                                          <div className="absolute left-0 top-0 z-10 flex items-center justify-center w-4 h-4">
                                                            <div className="h-4 w-4 rounded-full bg-status-done/20 flex items-center justify-center">
                                                              <Check className="h-3 w-3 text-status-blocked" />
                                                            </div>
                                                          </div>
                                                        ) : task.status === 'done' ? (
                                                          <div className="absolute left-0 top-0 z-10 flex items-center justify-center w-4 h-4">
                                                            <div className="h-4 w-4 rounded-full bg-status-done/20 flex items-center justify-center">
                                                              <Check className="h-3 w-3 text-green-500" />
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div
                                                            className="absolute left-0 top-0 z-10 flex items-center justify-center w-4 h-4"
                                                          >
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCompleteTask(task.id);
                                                              }}
                                                              className="h-4 w-4 rounded-full border border-foreground/30 flex items-center justify-center hover:border-foreground hover:bg-muted transition-all bg-background"
                                                            >
                                                              <Check className="h-3 w-3 text-foreground" />
                                                            </button>
                                                          </div>
                                                        )}
                                                        <h4
                                                          className="text-sm font-medium leading-tight truncate translate-x-6"
                                                        >
                                                          {task.title}
                                                        </h4>
                                                      </div>
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
                                                      <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {task.description}
                                                      </p>
                                                    )}

                                                    <div className="flex items-center justify-between pt-2">
                                                      <div className="flex -space-x-2">
                                                        {(task.assignees || []).slice(0, 3).map((assignee) => (
                                                          <Avatar key={assignee.id} className="h-5 w-5 border-2 border-background">
                                                            <AvatarFallback className="text-[9px] bg-muted">
                                                              {assignee.initials}
                                                            </AvatarFallback>
                                                          </Avatar>
                                                        ))}
                                                        {(task.assignees || []).length > 3 && (
                                                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center border-2 border-background z-10">
                                                            <span className="text-[8px] text-muted-foreground font-medium">
                                                              +{task.assignees!.length - 3}
                                                            </span>
                                                          </div>
                                                        )}
                                                      </div>
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
                                              </TooltipTrigger>
                                              {isBlocked && blockingInfo.length > 0 && (
                                                <TooltipContent side="right" className="max-w-xs">
                                                  <div className="space-y-1">
                                                    <p className="font-medium text-xs">Blocked by:</p>
                                                    <ul className="text-xs space-y-0.5">
                                                      {blockingInfo.map((info, i) => (
                                                        <li key={i} className="text-muted-foreground">• {info}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                </TooltipContent>
                                              )}
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}

                {/* Add Bucket Button */}
                <div className="w-[280px] flex-shrink-0">
                  <div className="sticky top-0 bg-background z-10 pb-3 space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      <h3 className="font-medium text-sm text-muted-foreground">Add Bucket</h3>
                    </div>
                    <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
                      <DialogTrigger asChild>
                        <div className="px-2">
                          <Button
                            variant="ghost"
                            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add New Bucket
                          </Button>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Bucket</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Bucket Name</Label>
                            <Input
                              placeholder="e.g., QA Testing"
                              value={newColumnName}
                              onChange={(e) => setNewColumnName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Color</Label>
                            <Select value={newColumnColor} onValueChange={setNewColumnColor}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {columnColorOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={cn('w-3 h-3 rounded-full', option.value)} />
                                      {option.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleAddColumn} className="w-full">
                            Add Bucket
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>



      {/* Task Detail Modal (Viewing/Editing) */}
      <TaskDetailModal
        task={selectedTask}
        allTasks={
          // Include current task if not in allTasks to verify dependencies
          allTasks || (selectedTask ? [selectedTask, ...tasks.filter(t => t.id !== selectedTask.id)] : tasks)
        }
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleTaskUpdate}
        onDelete={onTaskDelete}
        modules={modules}
        projectId={projectId}
        onAddModule={onAddModule}
      />

      {/* Task Detail Modal (Creating Maximized) */}
      <TaskDetailModal
        task={newTask as Task} // Cast for template
        allTasks={allTasks || tasks}
        isOpen={isMaximizedAddTask}
        onClose={() => setIsMaximizedAddTask(false)}
        onUpdate={(updated) => setNewTask(updated as unknown as Partial<Task>)}
        mode="create"
        onCreate={(newTask) => {
          onTaskCreate?.(newTask as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
          // Just close the maximized view
          setIsMaximizedAddTask(false);
        }}
        modules={modules}
        projectId={projectId}
        onAddModule={onAddModule}
      />
    </div>
  );
}
