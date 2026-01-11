import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus, Priority, ModuleType } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Plus, Check, GripVertical, X } from 'lucide-react';

interface KanbanColumn {
  id: string;
  status: TaskStatus | string;
  label: string;
  color: string;
}

interface KanbanViewProps {
  tasks: Task[];
}

const defaultColumns: KanbanColumn[] = [
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

const moduleColors = {
  hardware: 'border-l-module-hardware',
  software: 'border-l-module-software',
  firmware: 'border-l-module-firmware',
  testing: 'border-l-module-testing',
};

const columnColorOptions = [
  { value: 'bg-status-todo', label: 'Gray' },
  { value: 'bg-status-in-progress', label: 'Blue' },
  { value: 'bg-status-review', label: 'Purple' },
  { value: 'bg-status-done', label: 'Green' },
  { value: 'bg-status-blocked', label: 'Red' },
  { value: 'bg-chart-4', label: 'Yellow' },
];

export function KanbanView({ tasks: initialTasks }: KanbanViewProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskToColumn, setAddTaskToColumn] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('bg-status-todo');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    module: 'software' as ModuleType,
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, type } = result;

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

    // Dragging tasks
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    // Get tasks for source and destination columns
    const sourceTasks = tasks.filter(t => t.status === sourceColumn.status);
    const destTasks = source.droppableId === destination.droppableId 
      ? sourceTasks 
      : tasks.filter(t => t.status === destColumn.status);

    // Get the task being moved
    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    // Update task status if moved to different column
    const updatedTask = {
      ...movedTask,
      status: destColumn.status as TaskStatus,
    };

    // Update tasks array
    const newTasks = tasks.map(t => 
      t.id === movedTask.id ? updatedTask : t
    );

    setTasks(newTasks);
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: 'done' as TaskStatus } : t
    ));
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
    // Don't allow removing if there are tasks in the column
    const column = columns.find(c => c.id === columnId);
    if (column && tasks.some(t => t.status === column.status)) {
      return;
    }
    setColumns(columns.filter(c => c.id !== columnId));
  };

  const handleAddTask = () => {
    if (!newTask.title.trim() || !addTaskToColumn) return;

    const column = columns.find(c => c.id === addTaskToColumn);
    if (!column) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      status: column.status as TaskStatus,
      priority: newTask.priority,
      module: newTask.module,
      dependencies: [],
      blockedBy: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks([...tasks, task]);
    setNewTask({ title: '', description: '', priority: 'medium', module: 'software' });
    setIsAddTaskOpen(false);
    setAddTaskToColumn(null);
  };

  const openAddTaskDialog = (columnId: string) => {
    setAddTaskToColumn(columnId);
    setIsAddTaskOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Add Column Button */}
      <div className="flex justify-end">
        <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Bucket
            </Button>
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

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="COLUMN" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`,
              }}
            >
              {columns.map((column, index) => {
                const columnTasks = tasks.filter(t => t.status === column.status);

                return (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          'space-y-3 transition-shadow',
                          snapshot.isDragging && 'shadow-lg'
                        )}
                      >
                        {/* Column Header */}
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
                            {columnTasks.length}
                          </span>
                          {columnTasks.length === 0 && columns.length > 1 && (
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

                        {/* Tasks Droppable */}
                        <Droppable droppableId={column.id} type="TASK">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                'space-y-2 min-h-[200px] p-2 rounded-lg transition-colors',
                                snapshot.isDraggingOver ? 'bg-muted/50' : 'bg-muted/30'
                              )}
                            >
                              {columnTasks.map((task, taskIndex) => (
                                <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                  {(provided, snapshot) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        'p-3 cursor-grab active:cursor-grabbing border-l-4 relative group',
                                        moduleColors[task.module],
                                        snapshot.isDragging && 'shadow-lg rotate-2'
                                      )}
                                      onMouseEnter={() => setHoveredTask(task.id)}
                                      onMouseLeave={() => setHoveredTask(null)}
                                    >
                                      {/* Completion Checkbox */}
                                      {hoveredTask === task.id && task.status !== 'done' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCompleteTask(task.id);
                                          }}
                                          className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-status-done text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
                                        >
                                          <Check className="h-3 w-3" />
                                        </button>
                                      )}

                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="text-sm font-medium leading-tight">
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
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                          {task.assignee && (
                                            <Avatar className="h-5 w-5">
                                              <AvatarFallback className="text-[9px] bg-muted">
                                                {task.assignee.initials}
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

                              {/* Add Task Button */}
                              <Button
                                variant="ghost"
                                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                                onClick={() => openAddTaskDialog(column.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Task
                              </Button>
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                placeholder="Enter task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Enter task description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v as Priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Module</Label>
                <Select
                  value={newTask.module}
                  onValueChange={(v) => setNewTask({ ...newTask, module: v as ModuleType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="firmware">Firmware</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddTask} className="w-full">
              Add Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
