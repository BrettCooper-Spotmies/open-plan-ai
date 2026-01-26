import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Users,
  Calendar,
  Edit2,
  Trash2,
  ExternalLink,
  Save,
  X,
  Link,
  Plus,
} from 'lucide-react';
import { Module, Task, Issue, ModuleType, TeamMember } from '@/types';
import { formatModuleType, getModuleColor, getModuleTasks, getModuleProgress } from '../utils/projectUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ModuleWithStats extends Module {
  taskCount: number;
  progress: number;
  openIssues: number;
  tasks: Task[];
}

interface ModuleDetailModalProps {
  module: ModuleWithStats | null;
  allTasks: Task[];
  allIssues: Issue[];
  teamMembers: TeamMember[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (module: Module) => void;
  onDelete?: (moduleId: string) => void;
  onTaskClick?: (task: Task) => void;
  onIssueClick?: (issue: Issue) => void;
  onLinkTask?: (taskId: string, moduleId: string) => void;
  onUnlinkTask?: (taskId: string, moduleId: string) => void;
  onLinkIssue?: (issueId: string, moduleId: string) => void;
  onUnlinkIssue?: (issueId: string, moduleId: string) => void;
}

const moduleTypes: ModuleType[] = [
  'hardware', 'software', 'firmware', 'testing', 'design',
  'procurement', 'manufacturing', 'qa', 'logistics', 'enclosure', 'pcb', 'power'
];

export function ModuleDetailModal({
  module,
  allTasks,
  allIssues,
  teamMembers,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onTaskClick,
  onIssueClick,
  onLinkTask,
  onUnlinkTask,
  onLinkIssue,
  onUnlinkIssue,
}: ModuleDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedModule, setEditedModule] = useState<Module | null>(null);
  const [isLinkingTasks, setIsLinkingTasks] = useState(false);
  const [isLinkingIssues, setIsLinkingIssues] = useState(false);

  // Get available tasks and issues that can be linked (must be before early return)
  const availableTasks = useMemo(() =>
    module ? allTasks.filter(t => t.moduleId !== module.id) : [],
    [allTasks, module]
  );

  const availableIssues = useMemo(() =>
    module ? allIssues.filter(i => i.moduleId !== module.id) : [],
    [allIssues, module]
  );

  if (!module) return null;

  const moduleColor = getModuleColor(module.type);
  // Filter tasks by moduleId to show actually linked tasks
  const moduleTasks = allTasks.filter(t => t.moduleId === module.id);
  const moduleIssues = allIssues.filter(
    i => i.moduleId === module.id && i.status !== 'resolved' && i.status !== 'closed'
  );
  const completedTasks = moduleTasks.filter(t => t.status === 'done').length;
  const progress = moduleTasks.length > 0 ? (completedTasks / moduleTasks.length) * 100 : 0;

  const handleEdit = () => {
    setEditedModule({ ...module });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedModule && onUpdate) {
      onUpdate(editedModule);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedModule(null);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this module?')) {
      onDelete(module.id);
      onClose();
    }
  };

  const handleLinkTask = (taskId: string) => {
    if (onLinkTask) {
      onLinkTask(taskId, module.id);
    }
  };

  const handleUnlinkTask = (taskId: string) => {
    if (onUnlinkTask) {
      onUnlinkTask(taskId, module.id);
    }
  };

  const handleLinkIssue = (issueId: string) => {
    if (onLinkIssue) {
      onLinkIssue(issueId, module.id);
    }
  };

  const handleUnlinkIssue = (issueId: string) => {
    if (onUnlinkIssue) {
      onUnlinkIssue(issueId, module.id);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-status-done text-white';
      case 'in-progress': return 'bg-status-in-progress text-white';
      case 'review': return 'bg-status-review text-white';
      case 'blocked': return 'bg-status-blocked text-white';
      default: return 'bg-status-todo text-white';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'major': return 'bg-orange-500 text-white';
      case 'minor': return 'bg-yellow-500 text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: moduleColor }}
              />
              {isEditing && editedModule ? (
                <Input
                  value={editedModule.name}
                  onChange={(e) => setEditedModule({ ...editedModule, name: e.target.value })}
                  className="text-lg font-semibold h-8"
                />
              ) : (
                <DialogTitle className="text-xl">{module.name}</DialogTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 pb-6 space-y-6">
              {/* Overview Section */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    {isEditing && editedModule ? (
                      <Textarea
                        value={editedModule.description || ''}
                        onChange={(e) => setEditedModule({ ...editedModule, description: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm mt-1">
                        {module.description || <span className="text-muted-foreground">No description</span>}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Module Type</Label>
                    {isEditing && editedModule ? (
                      <Select
                        value={editedModule.type}
                        onValueChange={(value) => setEditedModule({ ...editedModule, type: value as ModuleType })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {moduleTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {formatModuleType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">
                        <Badge variant="secondary" className="capitalize">
                          {formatModuleType(module.type)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Owner</Label>
                    {isEditing && editedModule ? (
                      <Select
                        value={editedModule.owner?.id || ''}
                        onValueChange={(value) => {
                          const owner = teamMembers.find(m => m.id === value);
                          setEditedModule({ ...editedModule, owner });
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px]">{member.initials}</AvatarFallback>
                                </Avatar>
                                {member.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : module.owner ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">{module.owner.initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{module.owner.name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Unassigned</p>
                    )}
                  </div>

                  {module.createdAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p className="text-sm mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(module.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Statistics */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm">Statistics</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <ListTodo className="h-4 w-4" />
                        Total Tasks
                      </span>
                      <span className="font-medium">{moduleTasks.length}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </span>
                      <span className="font-medium">{completedTasks} / {moduleTasks.length}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {moduleIssues.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Open Issues
                        </span>
                        <Badge variant="destructive">{moduleIssues.length}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Related Tasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Related Tasks</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{moduleTasks.length}</Badge>
                    {onLinkTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsLinkingTasks(!isLinkingTasks)}
                        className="h-7"
                      >
                        <Link className="h-3.5 w-3.5 mr-1" />
                        {isLinkingTasks ? 'Done' : 'Link'}
                      </Button>
                    )}
                  </div>
                </div>

                {isLinkingTasks && availableTasks.length > 0 && (
                  <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                    <Label className="text-xs font-medium">Link Tasks to Module</Label>
                    <Select onValueChange={handleLinkTask}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            <div className="flex items-center gap-2">
                              <Badge className={cn('text-[10px]', getStatusBadgeColor(task.status))}>
                                {task.status.replace('-', ' ')}
                              </Badge>
                              <span className="truncate">{task.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {moduleTasks.length > 0 ? (
                  <div className="space-y-2">
                    {moduleTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => onTaskClick?.(task)}
                        >
                          <Badge className={cn('text-[10px] shrink-0', getStatusBadgeColor(task.status))}>
                            {task.status.replace('-', ' ')}
                          </Badge>
                          <span className="text-sm truncate">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.assignees?.[0] && (
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {task.assignees[0].initials}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {onUnlinkTask && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkTask(task.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          <ExternalLink
                            className="h-3.5 w-3.5 text-muted-foreground cursor-pointer"
                            onClick={() => onTaskClick?.(task)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No tasks linked to this module
                  </p>
                )}
              </div>

              {/* Related Issues */}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Open Issues
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{moduleIssues.length}</Badge>
                    {onLinkIssue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsLinkingIssues(!isLinkingIssues)}
                        className="h-7"
                      >
                        <Link className="h-3.5 w-3.5 mr-1" />
                        {isLinkingIssues ? 'Done' : 'Link'}
                      </Button>
                    )}
                  </div>
                </div>

                {isLinkingIssues && availableIssues.length > 0 && (
                  <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                    <Label className="text-xs font-medium">Link Issues to Module</Label>
                    <Select onValueChange={handleLinkIssue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIssues.map((issue) => (
                          <SelectItem key={issue.id} value={issue.id}>
                            <div className="flex items-center gap-2">
                              <Badge className={cn('text-[10px]', getSeverityBadgeColor(issue.severity))}>
                                {issue.severity}
                              </Badge>
                              <span className="truncate">{issue.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {moduleIssues.length > 0 ? (
                  <div className="space-y-2">
                    {moduleIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors group"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => onIssueClick?.(issue)}
                        >
                          <Badge className={cn('text-[10px] shrink-0', getSeverityBadgeColor(issue.severity))}>
                            {issue.severity}
                          </Badge>
                          <span className="text-sm truncate">{issue.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {onUnlinkIssue && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkIssue(issue.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          <ExternalLink
                            className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-pointer"
                            onClick={() => onIssueClick?.(issue)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No issues linked to this module
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
