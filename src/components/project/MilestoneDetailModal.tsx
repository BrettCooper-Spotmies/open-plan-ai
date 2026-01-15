import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Flag,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  Link2,
} from 'lucide-react';
import { Milestone, Task, Issue } from '@/types';
import { getMilestoneProgress, getMilestoneTasks, getMilestoneIssues, getMilestoneStatus } from '@/lib/projectUtils';

interface MilestoneDetailModalProps {
  milestone: Milestone | null;
  tasks: Task[];
  issues: Issue[];
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
  isOpen,
  onClose,
  onUpdate,
}: MilestoneDetailModalProps) {
  const [editedMilestone, setEditedMilestone] = useState<Milestone | null>(milestone);

  useEffect(() => {
    if (milestone) {
      setEditedMilestone(milestone);
    }
  }, [milestone]);

  if (!editedMilestone) return null;

  const handleFieldChange = <K extends keyof Milestone>(field: K, value: Milestone[K]) => {
    const updated = { ...editedMilestone, [field]: value };
    setEditedMilestone(updated);
    onUpdate(updated);
  };

  const handleToggleComplete = () => {
    const updated = {
      ...editedMilestone,
      completed: !editedMilestone.completed,
      completedAt: !editedMilestone.completed ? new Date().toISOString() : undefined,
    };
    setEditedMilestone(updated);
    onUpdate(updated);
  };

  const progress = getMilestoneProgress(editedMilestone, tasks);
  const milestoneTasks = getMilestoneTasks(editedMilestone, tasks);
  const milestoneIssues = getMilestoneIssues(editedMilestone.id, issues);
  const status = getMilestoneStatus(editedMilestone, tasks, issues);
  const daysUntil = Math.ceil((new Date(editedMilestone.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const completedTasks = milestoneTasks.filter(t => t.status === 'done').length;
  const inProgressTasks = milestoneTasks.filter(t => t.status === 'in-progress').length;
  const blockedTasks = milestoneTasks.filter(t => t.status === 'blocked').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              statusConfig[status].color
            )}>
              {editedMilestone.completed ? (
                <CheckCircle2 className="h-4 w-4 text-white" />
              ) : (
                <Flag className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="sr-only">Milestone Details</DialogTitle>
              <Input
                value={editedMilestone.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                placeholder="Milestone title..."
              />
            </div>
            <Badge variant="outline" className={cn('text-xs', statusConfig[status].textColor)}>
              {statusConfig[status].label}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Progress Overview */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="h-3 w-48" />
                  <span className="text-lg font-semibold">{progress}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="completed" 
                    checked={editedMilestone.completed}
                    onCheckedChange={handleToggleComplete}
                  />
                  <Label htmlFor="completed" className="text-sm cursor-pointer">
                    Mark as complete
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{milestoneTasks.length}</div>
                  <div className="text-xs text-muted-foreground">Total Tasks</div>
                </div>
                <div className="text-center p-3 bg-status-done/10 rounded-lg">
                  <div className="text-2xl font-bold text-status-done">{completedTasks}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-3 bg-status-in-progress/10 rounded-lg">
                  <div className="text-2xl font-bold text-status-in-progress">{inProgressTasks}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center p-3 bg-status-blocked/10 rounded-lg">
                  <div className="text-2xl font-bold text-status-blocked">{blockedTasks}</div>
                  <div className="text-xs text-muted-foreground">Blocked</div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Details */}
            <section className="grid grid-cols-2 gap-4">
              {/* Target Date */}
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

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time Remaining</Label>
                <div className={cn(
                  'p-2 rounded-md text-sm font-medium',
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
            </section>

            {/* Description */}
            <section className="space-y-3">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={editedMilestone.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Add a description for this milestone..."
                className="min-h-[80px] resize-none"
              />
            </section>

            <Separator />

            {/* Linked Tasks */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Linked Tasks ({milestoneTasks.length})
              </h3>
              
              {milestoneTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  No tasks are linked to this milestone
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {milestoneTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2.5 h-2.5 rounded-full',
                          task.status === 'done' ? 'bg-status-done' :
                          task.status === 'in-progress' ? 'bg-status-in-progress' :
                          task.status === 'blocked' ? 'bg-status-blocked' :
                          task.status === 'review' ? 'bg-status-review' :
                          'bg-status-todo'
                        )} />
                        <div>
                          <p className={cn(
                            'text-sm font-medium',
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
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Blocking Issues */}
            {milestoneIssues.length > 0 && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Blocking Issues ({milestoneIssues.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {milestoneIssues.map(issue => (
                      <div 
                        key={issue.id} 
                        className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                      >
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <div>
                            <p className="text-sm font-medium">{issue.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{issue.category.replace('-', ' ')}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs capitalize',
                            issue.severity === 'critical' && 'border-destructive text-destructive',
                            issue.severity === 'major' && 'border-orange-500 text-orange-500'
                          )}
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
