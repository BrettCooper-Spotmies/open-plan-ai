import { useState, useMemo } from 'react';
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
  Pencil,
  Check,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { attachmentsService } from '@/services/attachments.service';
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
  onDelete?: (taskId: string) => void;
  mode?: 'view' | 'create';
  onCreate?: (task: Task) => void;
  modules?: { id: string; name: string; type: ModuleType }[];
  projectId?: string;
  onAddModule?: () => void;
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

// 30 Colors: 15 Primary (Hard) + 15 Light
const TAG_PALETTE = [
  // Red
  { name: 'Red', color: 'bg-red-500 text-white hover:bg-red-600' },
  { name: 'Light Red', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  // Orange
  { name: 'Orange', color: 'bg-orange-500 text-white hover:bg-orange-600' },
  { name: 'Light Orange', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  // Amber
  { name: 'Amber', color: 'bg-amber-500 text-white hover:bg-amber-600' },
  { name: 'Light Amber', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  // Yellow
  { name: 'Yellow', color: 'bg-yellow-500 text-white hover:bg-yellow-600' },
  { name: 'Light Yellow', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  // Lime
  { name: 'Lime', color: 'bg-lime-500 text-white hover:bg-lime-600' },
  { name: 'Light Lime', color: 'bg-lime-100 text-lime-700 hover:bg-lime-200' },
  // Green
  { name: 'Green', color: 'bg-green-500 text-white hover:bg-green-600' },
  { name: 'Light Green', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  // Emerald
  { name: 'Emerald', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
  { name: 'Light Emerald', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  // Teal
  { name: 'Teal', color: 'bg-teal-500 text-white hover:bg-teal-600' },
  { name: 'Light Teal', color: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
  // Cyan
  { name: 'Cyan', color: 'bg-cyan-500 text-white hover:bg-cyan-600' },
  { name: 'Light Cyan', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
  // Sky
  { name: 'Sky', color: 'bg-sky-500 text-white hover:bg-sky-600' },
  { name: 'Light Sky', color: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
  // Blue
  { name: 'Blue', color: 'bg-blue-500 text-white hover:bg-blue-600' },
  { name: 'Light Blue', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  // Indigo
  { name: 'Indigo', color: 'bg-indigo-500 text-white hover:bg-indigo-600' },
  { name: 'Light Indigo', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
  // Violet
  { name: 'Violet', color: 'bg-violet-500 text-white hover:bg-violet-600' },
  { name: 'Light Violet', color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
  // Purple
  { name: 'Purple', color: 'bg-purple-500 text-white hover:bg-purple-600' },
  { name: 'Light Purple', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  // Fuchsia
  { name: 'Fuchsia', color: 'bg-fuchsia-500 text-white hover:bg-fuchsia-600' },
  { name: 'Light Fuchsia', color: 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200' },
];

// Helper to determine color based on tag name
// If the tag name matches (or was renamed from) a default color, we try to keep it.
// Since we don't store the metadata, we match by exact name first.
// If it's a custom name, we hash it to one of the palette colors.
const getTagColor = (tag: string) => {
  // Check if it matches a default name directly
  const directMatch = TAG_PALETTE.find(p => p.name.toLowerCase() === tag.toLowerCase());
  if (directMatch) return directMatch.color;

  // Otherwise hash to a stable color
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_PALETTE.length;
  return TAG_PALETTE[index].color;
};

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
  onDelete,
  mode = 'view',
  onCreate,
  modules = [],
  projectId,
  onAddModule,
}: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(task);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedBlockingTask, setSelectedBlockingTask] = useState('');
  const [selectedBlockedByTask, setSelectedBlockedByTask] = useState('');
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleType, setNewModuleType] = useState<ModuleType>('software');

  // Sync editedTask when task prop changes
  if (task && editedTask?.id !== task.id) {
    setEditedTask(task);
  }

  // Dependencies handlers
  // Compute "Blocking To" client-side - tasks that have THIS task in their blockedBy
  const blockingToTaskIds = useMemo(() => {
    if (!editedTask) return [];
    return allTasks
      .filter(task => task.blockedBy.includes(editedTask.id))
      .map(task => task.id);
  }, [allTasks, editedTask?.id]);

  if (!editedTask) return null;

  const handleFieldChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    const updated = { ...editedTask, [field]: value, updatedAt: new Date().toISOString() };
    setEditedTask(updated);
    onUpdate(updated);
  };

  const handleCreate = () => {
    if (editedTask && onCreate) {
      onCreate(editedTask);
      onClose();
    }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${projectId || 'temp'}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        // Create attachment record in the database if task exists
        let attachmentId = `attachment-${Date.now()}-${Math.random()}`;
        let uploadedBy = teamMembers[0]; // Mock current user for fallback

        if (mode !== 'create' && editedTask.id) {
          try {
            const dbAttachment = await attachmentsService.create({
              entity_id: editedTask.id,
              entity_type: 'task',
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              project_id: projectId,
            });
            attachmentId = dbAttachment.id;
            // Map db user to TeamMember if needed, but for now we keep the mock or use real user if we had one
          } catch (dbError) {
            console.error('Error creating attachment record in DB:', dbError);
            // Even if DB fails, we have the file in storage and it will show in UI temporarily
          }
        }

        const attachment: Attachment = {
          id: attachmentId,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedBy: uploadedBy,
          uploadedAt: new Date().toISOString(),
          url: publicUrl,
        };

        newAttachments.push(attachment);
      }

      handleFieldChange('attachments', [...attachments, ...newAttachments]);
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setIsUploading(false);
    }
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



  const availableTasksForBlocking = allTasks.filter(
    t => t.id !== editedTask.id && !blockingToTaskIds.includes(t.id)
  );
  const availableTasksForBlockedBy = allTasks.filter(
    t => t.id !== editedTask.id && !editedTask.blockedBy.includes(t.id)
  );

  // Adding to "Blocking To" - update the OTHER task's blockedBy
  const handleAddBlockingTask = () => {
    if (!selectedBlockingTask) return;
    const taskToUpdate = allTasks.find(t => t.id === selectedBlockingTask);
    if (taskToUpdate) {
      // Add current task to that task's blockedBy
      const updatedBlockedBy = [...taskToUpdate.blockedBy, editedTask.id];
      onUpdate({ ...taskToUpdate, blockedBy: updatedBlockedBy });
    }
    setSelectedBlockingTask('');
  };

  const handleUpdateTask = async () => {
    setIsSaving(true);
    try {
      await onUpdate(editedTask);
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Removing from "Blocking To" - remove current task from the OTHER task's blockedBy
  const handleRemoveBlockingTask = (taskId: string) => {
    const taskToUpdate = allTasks.find(t => t.id === taskId);
    if (taskToUpdate) {
      const updatedBlockedBy = taskToUpdate.blockedBy.filter(id => id !== editedTask.id);
      onUpdate({ ...taskToUpdate, blockedBy: updatedBlockedBy });
    }
  };

  // Adding to "Blocked By" - update THIS task's blockedBy
  const handleAddBlockedByTask = () => {
    if (!selectedBlockedByTask) return;
    handleFieldChange('blockedBy', [...editedTask.blockedBy, selectedBlockedByTask]);
    setSelectedBlockedByTask('');
  };

  // Removing from "Blocked By" - update THIS task's blockedBy
  const handleRemoveBlockedByTask = (taskId: string) => {
    handleFieldChange('blockedBy', editedTask.blockedBy.filter(id => id !== taskId));
  };

  const getTaskById = (id: string) => allTasks.find(t => t.id === id);

  const handleDelete = () => {
    if (onDelete && editedTask && editedTask.id && window.confirm('Are you sure you want to delete this task?')) {
      onDelete(editedTask.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
          <DialogTitle>{mode === 'create' ? 'Add New Task' : 'Task Details'}</DialogTitle>
          {mode !== 'create' && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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
                    value={editedTask.moduleId || (modules?.find(m => m.type === editedTask.module)?.id || '')}
                    onValueChange={(value) => {
                      const selected = modules?.find(m => m.id === value);
                      if (selected) {
                        handleFieldChange('moduleId', selected.id);
                        handleFieldChange('module', selected.type);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules && modules.length > 0 ? (
                        modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs h-8"
                            onClick={(e) => {
                              e.preventDefault();
                              onAddModule?.();
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Create Module
                          </Button>
                        </div>
                      )}
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

                {/* Created By */}
                {mode !== 'create' && editedTask.createdBy && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      Created By
                    </Label>
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/30">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">
                          {editedTask.createdBy.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{editedTask.createdBy.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Tags
                </Label>
                <div className="min-h-10 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  {editedTask.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className={cn("text-xs font-normal pointer-events-none pl-2 pr-1 gap-1", getTagColor(tag))}
                    >
                      {tag}
                      <button
                        onClick={() => handleFieldChange('tags', editedTask.tags.filter(t => t !== tag))}
                        className="pointer-events-auto hover:bg-black/10 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  <Popover
                    open={isTagPopoverOpen}
                    onOpenChange={(open) => {
                      setIsTagPopoverOpen(open);
                      if (!open) setEditingTagIndex(null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button className="h-6 w-6 rounded-full p-0 border border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary hover:text-primary transition-all bg-transparent shadow-none focus:ring-0 flex items-center justify-center group relative">
                        <div className="absolute inset-0 rounded-full border border-muted-foreground/30 group-hover:border-primary transition-colors" />
                        <Plus className="h-3 w-3 z-10" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[240px] max-h-[350px] flex flex-col overflow-hidden" align="start">
                      <Command className="flex-1 min-h-0">
                        <CommandInput
                          placeholder="Search tags..."
                          value={tagSearch}
                          onValueChange={setTagSearch}
                        />
                        <CommandList className="flex-1 overflow-y-auto min-h-0">
                          <CommandEmpty className="py-2 px-2">
                            <div className="text-sm text-center py-2 text-muted-foreground">
                              No matching tags.
                            </div>
                            {tagSearch.trim() && (
                              <button
                                className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                                onClick={() => {
                                  handleFieldChange('tags', [...editedTask.tags, tagSearch.trim()]);
                                  setTagSearch('');
                                  setIsTagPopoverOpen(false);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                                Create "{tagSearch}"
                              </button>
                            )}
                          </CommandEmpty>
                          {TAG_PALETTE
                            .filter(item => !editedTask.tags.includes(item.name)) // Simple filter by name
                            .map((item, index) => (
                              <CommandItem
                                key={index}
                                value={item.name}
                                onSelect={() => {
                                  if (editingTagIndex !== index) {
                                    handleFieldChange('tags', [...editedTask.tags, item.name]);
                                    setIsTagPopoverOpen(false);
                                  }
                                }}
                                className="cursor-pointer group flex items-center justify-between"
                              >
                                {editingTagIndex === index ? (
                                  <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                    <div className={cn("w-3 h-3 rounded-full shrink-0", item.color.split(' ')[0])} />
                                    <Input
                                      autoFocus
                                      value={editingTagValue}
                                      onChange={(e) => setEditingTagValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.stopPropagation();
                                          if (editingTagValue.trim()) {
                                            handleFieldChange('tags', [...editedTask.tags, editingTagValue.trim()]);
                                            setIsTagPopoverOpen(false);
                                            setEditingTagIndex(null);
                                          }
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 w-full text-xs px-1 py-0 min-w-0"
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 mt-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (editingTagValue.trim()) {
                                          handleFieldChange('tags', [...editedTask.tags, editingTagValue.trim()]);
                                          setIsTagPopoverOpen(false);
                                          setEditingTagIndex(null);
                                        }
                                      }}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-3 h-3 rounded-full shrink-0", item.color.split(' ')[0])} />
                                      <span>{item.name}</span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTagIndex(index);
                                        setEditingTagValue(item.name);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 hover:bg-muted p-1 rounded-sm transition-all"
                                    >
                                      <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                  </>
                                )}
                              </CommandItem>
                            ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group cursor-pointer hover:bg-muted"
                      onClick={() => window.open(attachment.url, '_blank')}
                    >
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.fileSize)} • Uploaded by {attachment.uploadedBy.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(attachment.url, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(attachment.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <label className={cn(
                  "flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors",
                  isUploading && "opacity-50 pointer-events-none"
                )}>
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isUploading ? "Uploading..." : "Drop files or click to upload"}
                  </span>
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
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
                    {blockingToTaskIds.map((taskId) => {
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
        {mode === 'create' && (
          <div className="px-6 py-4 border-t flex justify-end gap-2 bg-background">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Task
            </Button>
          </div>
        )}
        {mode === 'view' && (
          <div className="px-6 py-4 border-t flex justify-end gap-2 bg-background">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Task
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}