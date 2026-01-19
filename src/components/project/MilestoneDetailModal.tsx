import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  ListTodo,
  Box,
} from 'lucide-react';
import { Milestone, Task, Issue, Module } from '@/types';
import { getMilestoneProgress, getMilestoneTasks, getMilestoneIssues, getMilestoneStatus, getModuleProgress } from '@/lib/projectUtils';

interface MilestoneDetailModalProps {
  milestone: Milestone | null;
  tasks: Task[];
  issues: Issue[];
  modules?: Module[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (milestone: Milestone) => void;
}

const statusConfig = {
  completed: { color: 'bg-status-done', textColor: 'text-status-done', label: 'Completed' },
  blocked: { color: 'bg-destructive', textColor: 'text-destructive', label: 'Blocked' },
  'at-risk': { color: 'bg-orange-500', textColor: 'text-orange-500', label: 'At Risk' },
  'on-track': { color: 'bg-chart-2', textColor: 'text-chart-2', label: 'On Track' },
};

export function MilestoneDetailModal({
  milestone,
  tasks,
  issues,
  modules = [],
  isOpen,
  onClose,
  onUpdate,
}: MilestoneDetailModalProps) {
  const [editedMilestone, setEditedMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    // Only set initial state when opening modal with a new milestone
    if (isOpen && milestone) {
      setEditedMilestone(milestone);
    }
  }, [isOpen, milestone?.id]); // Only depend on isOpen and milestone.id to prevent re-runs

  if (!editedMilestone) return null;

  const handleFieldChange = <K extends keyof Milestone>(field: K, value: Milestone[K]) => {
    setEditedMilestone(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      // Debounce the update to parent to prevent infinite loops
      setTimeout(() => onUpdate(updated), 0);
      return updated;
    });
  };

  const handleToggleComplete = () => {
    setEditedMilestone(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        completed: !prev.completed,
        completedAt: !prev.completed ? new Date().toISOString() : undefined,
      };
      setTimeout(() => onUpdate(updated), 0);
      return updated;
    });
  };

  const progress = getMilestoneProgress(editedMilestone, tasks);
  const milestoneTasks = getMilestoneTasks(editedMilestone, tasks);
  const milestoneIssues = getMilestoneIssues(editedMilestone.id, issues);
  const status = getMilestoneStatus(editedMilestone, tasks, issues);
  const daysUntil = Math.ceil((new Date(editedMilestone.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const completedTasks = milestoneTasks.filter(t => t.status === 'done').length;
  const inProgressTasks = milestoneTasks.filter(t => t.status === 'in-progress').length;
  const blockedTasks = milestoneTasks.filter(t => t.status === 'blocked').length;

  // Get linked modules
  const linkedModules = modules.filter(m => 
    editedMilestone.linkedModuleIds?.includes(m.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Milestone Details</DialogTitle>
          <DialogDescription className="sr-only">
            View and edit milestone information, linked tasks, modules, and issues.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Title + Status Badge Row */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  value={editedMilestone.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 flex-1"
                  placeholder="Milestone title..."
                />
                <Badge variant="outline" className={cn('text-xs shrink-0', statusConfig[status].textColor)}>
                  {statusConfig[status].label}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-sm font-medium w-12 text-right">{progress}%</span>
                <div className="flex items-center gap-2 ml-4">
                  <Checkbox 
                    id="completed" 
                    checked={editedMilestone.completed}
                    onCheckedChange={handleToggleComplete}
                  />
                  <Label htmlFor="completed" className="text-sm cursor-pointer text-muted-foreground">
                    Mark as complete
                  </Label>
                </div>
              </div>
            </div>

            {/* Stats Grid - Equal width/height */}
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg min-h-[80px]">
                <div className="text-2xl font-bold">{milestoneTasks.length}</div>
                <div className="text-xs text-muted-foreground text-center">Total Tasks</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-status-done/10 rounded-lg min-h-[80px]">
                <div className="text-2xl font-bold text-status-done">{completedTasks}</div>
                <div className="text-xs text-muted-foreground text-center">Completed</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-status-in-progress/10 rounded-lg min-h-[80px]">
                <div className="text-2xl font-bold text-status-in-progress">{inProgressTasks}</div>
                <div className="text-xs text-muted-foreground text-center">In Progress</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-status-blocked/10 rounded-lg min-h-[80px]">
                <div className="text-2xl font-bold text-status-blocked">{blockedTasks}</div>
                <div className="text-xs text-muted-foreground text-center">Blocked</div>
              </div>
            </div>

            <Separator />

            {/* Date and Time Remaining */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3" />
                  Target Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !editedMilestone.date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(editedMilestone.date), 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(editedMilestone.date)}
                      onSelect={(date) => date && handleFieldChange('date', date.toISOString().split('T')[0])}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time Remaining</Label>
                <div className={cn(
                  'p-2 rounded-md text-sm font-medium h-10 flex items-center',
                  editedMilestone.completed 
                    ? 'bg-status-done/10 text-status-done'
                    : daysUntil < 0 
                      ? 'bg-destructive/10 text-destructive'
                      : daysUntil < 7 
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-muted text-foreground'
                )}>
                  {editedMilestone.completed 
                    ? `Completed ${editedMilestone.completedAt ? format(new Date(editedMilestone.completedAt), 'MMM d, yyyy') : ''}`
                    : daysUntil < 0 
                      ? `${Math.abs(daysUntil)} days overdue`
                      : daysUntil === 0 
                        ? 'Due today'
                        : `${daysUntil} days remaining`
                  }
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={editedMilestone.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Add a description for this milestone..."
                className="min-h-[80px] resize-none"
              />
            </div>

            <Separator />

            {/* Linked Tasks */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Linked Tasks ({milestoneTasks.length})
              </h3>
              
              {milestoneTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center bg-muted/30 rounded-lg">
                  No tasks are linked to this milestone
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {milestoneTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0',
                        task.status === 'done' ? 'bg-status-done' :
                        task.status === 'in-progress' ? 'bg-status-in-progress' :
                        task.status === 'blocked' ? 'bg-status-blocked' :
                        task.status === 'review' ? 'bg-status-review' :
                        'bg-status-todo'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          task.status === 'done' && 'line-through text-muted-foreground'
                        )}>
                          {task.title}
                        </p>
                        {task.assignees && task.assignees.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {task.assignees[0].name}
                            {task.assignees.length > 1 && ` +${task.assignees.length - 1}`}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Modules */}
            {linkedModules.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Linked Modules ({linkedModules.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {linkedModules.map(module => {
                      const moduleProgress = getModuleProgress(module.id, tasks);
                      return (
                        <div 
                          key={module.id} 
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: module.color || '#6B7280' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{module.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={moduleProgress} className="h-1.5 flex-1 max-w-[120px]" />
                              <span className="text-xs text-muted-foreground">{moduleProgress}%</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize shrink-0">
                            {module.type}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Blocking Issues */}
            {milestoneIssues.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Blocking Issues ({milestoneIssues.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {milestoneIssues.map(issue => (
                      <div 
                        key={issue.id} 
                        className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                      >
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{issue.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{issue.category.replace('-', ' ')}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs capitalize shrink-0',
                            issue.severity === 'critical' && 'border-destructive text-destructive',
                            issue.severity === 'major' && 'border-orange-500 text-orange-500'
                          )}
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}