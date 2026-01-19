import { useState } from 'react';
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
} from 'lucide-react';
import { Module, Task, Issue, ModuleType, TeamMember } from '@/types';
import { formatModuleType, getModuleColor, getModuleTasks, getModuleProgress } from '@/lib/projectUtils';
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
}: ModuleDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedModule, setEditedModule] = useState<Module | null>(null);

  if (!module) return null;

  const moduleColor = getModuleColor(module.type);
  const moduleTasks = getModuleTasks(module.type, allTasks);
  const moduleIssues = allIssues.filter(
    i => i.moduleId === module.id && i.status !== 'resolved' && i.status !== 'closed'
  );
  const completedTasks = moduleTasks.filter(t => t.status === 'done').length;
  const progress = getModuleProgress(module.type, allTasks);

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
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0">
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

        <ScrollArea className="flex-1 max-h-[calc(90vh-100px)]">
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
                <Badge variant="secondary">{moduleTasks.length}</Badge>
              </div>

              {moduleTasks.length > 0 ? (
                <div className="space-y-2">
                  {moduleTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
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
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                  {moduleTasks.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{moduleTasks.length - 5} more tasks
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No tasks linked to this module
                </p>
              )}
            </div>

            {/* Related Issues */}
            {moduleIssues.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Open Issues
                    </h4>
                    <Badge variant="destructive">{moduleIssues.length}</Badge>
                  </div>

                  <div className="space-y-2">
                    {moduleIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors"
                        onClick={() => onIssueClick?.(issue)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge className={cn('text-[10px] shrink-0', getSeverityBadgeColor(issue.severity))}>
                            {issue.severity}
                          </Badge>
                          <span className="text-sm truncate">{issue.title}</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
