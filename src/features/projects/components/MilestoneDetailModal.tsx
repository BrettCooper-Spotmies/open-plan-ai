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
  Plus,
  X,
} from 'lucide-react';
import { Milestone, Task, Issue, Module } from '@/types';
import { getMilestoneProgress, getMilestoneTasks, getMilestoneIssues, getMilestoneStatus, getModuleProgress } from '../utils/projectUtils';

interface MilestoneDetailModalProps {
  milestone: Milestone | null;
  tasks: Task[];
  issues: Issue[];
  modules?: Module[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (milestone: Milestone) => void;
  onIssueUpdate?: (issue: Issue) => void;
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
  onIssueUpdate,
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

  // Available items for linking (not already linked)
  const availableTasks = tasks.filter(t => !editedMilestone.linkedTaskIds?.includes(t.id));
  const availableModules = modules.filter(m => !editedMilestone.linkedModuleIds?.includes(m.id));
  const availableIssues = issues.filter(i =>
    !milestoneIssues.some(mi => mi.id === i.id) &&
    i.status !== 'resolved' &&
    i.status !== 'closed' &&
    i.status !== 'wont-fix'
  );

  // Handlers for adding/removing linked items
  const handleToggleTask = (taskId: string) => {
    const currentTasks = editedMilestone.linkedTaskIds || [];
    const updated = currentTasks.includes(taskId)
      ? currentTasks.filter(id => id !== taskId)
      : [...currentTasks, taskId];
    handleFieldChange('linkedTaskIds', updated);
  };

  const handleToggleModule = (moduleId: string) => {
    const currentModules = editedMilestone.linkedModuleIds || [];
    const updated = currentModules.includes(moduleId)
      ? currentModules.filter(id => id !== moduleId)
      : [...currentModules, moduleId];
    handleFieldChange('linkedModuleIds', updated);
  };

  const handleToggleIssue = (issueId: string) => {
    if (!onIssueUpdate) return;

    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const currentMilestones = issue.blocksMilestoneIds || [];
    const isLinked = currentMilestones.includes(editedMilestone.id);

    const updatedIssue = {
      ...issue,
      blocksMilestoneIds: isLinked
        ? currentMilestones.filter(id => id !== editedMilestone.id)
        : [...currentMilestones, editedMilestone.id]
    };

    onIssueUpdate(updatedIssue);
  };

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
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors group"
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleToggleTask(task.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Tasks Section */}
              {availableTasks.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Add Tasks</Label>
                  <div className="border rounded-lg max-h-[120px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {availableTasks.slice(0, 5).map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleToggleTask(task.id)}
                        >
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => handleToggleTask(task.id)}
                          />
                          <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            task.status === 'done' ? 'bg-status-done' :
                              task.status === 'in-progress' ? 'bg-status-in-progress' :
                                task.status === 'blocked' ? 'bg-status-blocked' :
                                  'bg-status-todo'
                          )} />
                          <span className="text-sm flex-1 truncate">{task.title}</span>
                          <Badge variant="outline" className="text-xs capitalize shrink-0">
                            {task.status.replace('-', ' ')}
                          </Badge>
                        </div>
                      ))}
                      {availableTasks.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          +{availableTasks.length - 5} more available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>


            <Separator />

            {/* Linked Modules */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Box className="h-4 w-4" />
                Linked Modules ({linkedModules.length})
              </h3>

              {linkedModules.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center bg-muted/30 rounded-lg">
                  No modules are linked to this milestone
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {linkedModules.map(module => {
                    const moduleProgress = getModuleProgress(module.id, tasks);
                    return (
                      <div
                        key={module.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors group"
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggleModule(module.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Modules Section */}
              {availableModules.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Add Modules</Label>
                  <div className="border rounded-lg max-h-[120px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {availableModules.map(module => (
                        <div
                          key={module.id}
                          className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleToggleModule(module.id)}
                        >
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => handleToggleModule(module.id)}
                          />
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: module.color || '#6B7280' }}
                          />
                          <span className="text-sm flex-1 truncate">{module.name}</span>
                          <Badge variant="outline" className="text-xs capitalize shrink-0">
                            {module.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>


            <Separator />

            {/* Linked Issues */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Linked Issues ({milestoneIssues.length})
              </h3>

              {milestoneIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center bg-muted/30 rounded-lg">
                  No issues are linked to this milestone
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {milestoneIssues.map(issue => (
                    <div
                      key={issue.id}
                      className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20 group hover:bg-destructive/15 transition-colors"
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
                      {onIssueUpdate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggleIssue(issue.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Issues Section */}
              {onIssueUpdate && availableIssues.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Add Issues</Label>
                  <div className="border rounded-lg max-h-[120px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {availableIssues.slice(0, 5).map(issue => (
                        <div
                          key={issue.id}
                          className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleToggleIssue(issue.id)}
                        >
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => handleToggleIssue(issue.id)}
                          />
                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                          <span className="text-sm flex-1 truncate">{issue.title}</span>
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
                      {availableIssues.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          +{availableIssues.length - 5} more available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}