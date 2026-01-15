import { useState } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from '@/lib/utils';
import {
  X,
  Calendar as CalendarIcon,
  Paperclip,
  MessageSquare,
  Link2,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  CheckSquare,
  User,
  Tag,
  AlertCircle,
} from 'lucide-react';
import {
  Task,
  TaskStatus,
  Priority,
  ModuleType,
  TeamMember,
  ChecklistItem,
  Attachment,
  Comment,
} from '@/types';
import { teamMembers } from '@/data/mockData';

interface TaskDetailModalProps {
  task: Task | null;
  allTasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'Not Started', color: 'bg-status-todo' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-status-in-progress' },
  { value: 'review', label: 'In Review', color: 'bg-status-review' },
  { value: 'blocked', label: 'Blocked', color: 'bg-status-blocked' },
  { value: 'done', label: 'Completed', color: 'bg-status-done' },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-priority-critical text-white' },
  { value: 'high', label: 'High', color: 'bg-priority-high text-white' },
  { value: 'medium', label: 'Medium', color: 'bg-priority-medium text-white' },
  { value: 'low', label: 'Low', color: 'bg-priority-low text-white' },
];

const moduleOptions: { value: ModuleType; label: string }[] = [
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'firmware', label: 'Firmware' },
  { value: 'testing', label: 'Testing' },
];

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function TaskDetailModal({
  task,
  allTasks,
  isOpen,
  onClose,
  onUpdate,
}: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(task);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedBlockingTask, setSelectedBlockingTask] = useState('');
  const [selectedBlockedByTask, setSelectedBlockedByTask] = useState('');
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);

  // Sync editedTask when task prop changes
  if (task && editedTask?.id !== task.id) {
    setEditedTask(task);
  }

  if (!editedTask) return null;

  const handleFieldChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    const updated = { ...editedTask, [field]: value, updatedAt: new Date().toISOString() };
    setEditedTask(updated);
    onUpdate(updated);
  };

  // Checklist handlers
  const checklist = editedTask.checklist || [];
  const completedItems = checklist.filter(item => item.completed).length;
  const checklistProgress = checklist.length > 0 ? (completedItems / checklist.length) * 100 : 0;

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: `checklist-${Date.now()}`,
      text: newChecklistItem,
      completed: false,
    };
    handleFieldChange('checklist', [...checklist, newItem]);
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    handleFieldChange('checklist', updated);
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    handleFieldChange('checklist', checklist.filter(item => item.id !== itemId));
  };

  // Attachment handlers
  const attachments = editedTask.attachments || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: `attachment-${Date.now()}-${Math.random()}`,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: teamMembers[0], // Mock current user
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    }));

    handleFieldChange('attachments', [...attachments, ...newAttachments]);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    handleFieldChange('attachments', attachments.filter(a => a.id !== attachmentId));
  };

  // Comments handlers
  const comments = editedTask.comments || [];

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const newCommentObj: Comment = {
      id: `comment-${Date.now()}`,
      content: newComment,
      author: teamMembers[0], // Mock current user
      createdAt: new Date().toISOString(),
    };
    handleFieldChange('comments', [...comments, newCommentObj]);
    setNewComment('');
  };

  // Dependencies handlers
  const availableTasksForBlocking = allTasks.filter(
    t => t.id !== editedTask.id && !editedTask.dependencies.includes(t.id)
  );
  const availableTasksForBlockedBy = allTasks.filter(
    t => t.id !== editedTask.id && !editedTask.blockedBy.includes(t.id)
  );

  const handleAddBlockingTask = () => {
    if (!selectedBlockingTask) return;
    handleFieldChange('dependencies', [...editedTask.dependencies, selectedBlockingTask]);
    setSelectedBlockingTask('');
  };

  const handleRemoveBlockingTask = (taskId: string) => {
    handleFieldChange('dependencies', editedTask.dependencies.filter(id => id !== taskId));
  };

  const handleAddBlockedByTask = () => {
    if (!selectedBlockedByTask) return;
    handleFieldChange('blockedBy', [...editedTask.blockedBy, selectedBlockedByTask]);
    setSelectedBlockedByTask('');
  };

  const handleRemoveBlockedByTask = (taskId: string) => {
    handleFieldChange('blockedBy', editedTask.blockedBy.filter(id => id !== taskId));
  };

  const getTaskById = (id: string) => allTasks.find(t => t.id === id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Task Title */}
            <Input
              value={editedTask.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
              placeholder="Task title..."
            />

            {/* Task Overview Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Task Overview
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Assignees */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    Assigned To
                  </Label>
                  <div className="min-h-10 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    {(editedTask.assignees || []).map((assignee) => (
                      <Badge key={assignee.id} variant="secondary" className="pl-1 pr-1.5 gap-1.5 h-6 hover:bg-secondary/80 transition-colors cursor-default">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[9px]">
                            {assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-normal">{assignee.name}</span>
                        <button
                          onClick={() => handleFieldChange('assignees', (editedTask.assignees || []).filter(a => a.id !== assignee.id))}
                          className="ml-auto text-muted-foreground hover:text-foreground transition-colors outline-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}>
                      <PopoverTrigger asChild>
                        <button className="h-6 w-6 rounded-full p-0 border border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary hover:text-primary transition-all bg-transparent shadow-none focus:ring-0 [&>svg]:hidden flex items-center justify-center">
                          <span>
                            <Plus className="h-3 w-3" />
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[200px]" align="start">
                        <Command>
                          <CommandInput placeholder="Search members..." />
                          <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup heading="Team Members">
                              {teamMembers
                                .filter(m => !editedTask.assignees?.some(a => a.id === m.id))
                                .map((member) => (
                                  <CommandItem
                                    key={member.id}
                                    value={member.name}
                                    onSelect={() => {
                                      handleFieldChange('assignees', [...(editedTask.assignees || []), member]);
                                      setIsAssigneePopoverOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-[9px]">
                                          {member.initials}
                                        </AvatarFallback>
                                      </Avatar>
                                      {member.name}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    Status
                  </Label>
                  <Select
                    value={editedTask.status}
                    onValueChange={(value) => handleFieldChange('status', value as TaskStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', statusOptions.find(s => s.value === editedTask.status)?.color)} />
                          {statusOptions.find(s => s.value === editedTask.status)?.label}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', option.color)} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select
                    value={editedTask.priority}
                    onValueChange={(value) => handleFieldChange('priority', value as Priority)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <Badge className={cn('text-xs', priorityOptions.find(p => p.value === editedTask.priority)?.color)}>
                          {priorityOptions.find(p => p.value === editedTask.priority)?.label}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <Badge className={cn('text-xs', option.color)}>{option.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Module */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    Module
                  </Label>
                  <Select
                    value={editedTask.module}
                    onValueChange={(value) => handleFieldChange('module', value as ModuleType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-3 w-3" />
                    Start Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !editedTask.startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedTask.startDate
                          ? format(new Date(editedTask.startDate), 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedTask.startDate ? new Date(editedTask.startDate) : undefined}
                        onSelect={(date) => handleFieldChange('startDate', date?.toISOString())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-3 w-3" />
                    Due Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !editedTask.dueDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedTask.dueDate
                          ? format(new Date(editedTask.dueDate), 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedTask.dueDate ? new Date(editedTask.dueDate) : undefined}
                        onSelect={(date) => handleFieldChange('dueDate', date?.toISOString())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {editedTask.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        onClick={() => handleFieldChange('tags', editedTask.tags.filter(t => t !== tag))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    placeholder="Add tag..."
                    className="w-24 h-6 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !editedTask.tags.includes(value)) {
                          handleFieldChange('tags', [...editedTask.tags, value]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Description Section */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h3>
              <Textarea
                value={editedTask.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Add a detailed description for this task..."
                className="min-h-[120px] resize-none"
              />
            </section>

            <Separator />

            {/* Checklist Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Checklist
                  {checklist.length > 0 && (
                    <span className="text-xs">({completedItems}/{checklist.length})</span>
                  )}
                </h3>
              </div>

              {checklist.length > 0 && (
                <Progress value={checklistProgress} className="h-2" />
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    placeholder="Add checklist item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAddChecklistItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => handleToggleChecklistItem(item.id)}
                    />
                    <span className={cn('flex-1 text-sm', item.completed && 'line-through text-muted-foreground')}>
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Attachments Section */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </h3>

              <div className="space-y-2">
                {attachments.map((attachment) => {
                  const FileIcon = getFileIcon(attachment.fileType);
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group"
                    >
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.fileSize)} • Uploaded by {attachment.uploadedBy.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Drop files or click to upload</span>
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </section>

            <Separator />

            {/* Dependencies Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Dependencies
              </h3>

              <div className="grid grid-cols-2 gap-6">
                {/* Blocking To */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-priority-high" />
                    <Label className="text-xs font-medium">Blocking To</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Tasks that depend on this task</p>

                  <div className="space-y-2">
                    {editedTask.dependencies.map((taskId) => {
                      const depTask = getTaskById(taskId);
                      if (!depTask) return null;
                      return (
                        <div
                          key={taskId}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              statusOptions.find(s => s.value === depTask.status)?.color
                            )} />
                            <span className="text-sm truncate">{depTask.title}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveBlockingTask(taskId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}

                    <div className="flex gap-2">
                      <Select value={selectedBlockingTask} onValueChange={setSelectedBlockingTask}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasksForBlocking.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={handleAddBlockingTask}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Blocked By */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-status-blocked" />
                    <Label className="text-xs font-medium">Blocked By</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Tasks that must complete first</p>

                  <div className="space-y-2">
                    {editedTask.blockedBy.map((taskId) => {
                      const depTask = getTaskById(taskId);
                      if (!depTask) return null;
                      return (
                        <div
                          key={taskId}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              statusOptions.find(s => s.value === depTask.status)?.color
                            )} />
                            <span className="text-sm truncate">{depTask.title}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveBlockedByTask(taskId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}

                    <div className="flex gap-2">
                      <Select value={selectedBlockedByTask} onValueChange={setSelectedBlockedByTask}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasksForBlockedBy.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={handleAddBlockedByTask}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Comments Section */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h3>

              <div className="space-y-3">
                {/* {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Start the conversation!
                  </p>
                )} */}

                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">SC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}