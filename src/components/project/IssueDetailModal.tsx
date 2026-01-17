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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Truck,
  FileWarning,
  FlaskConical,
  Pencil,
  Link2,
  User,
  Tag,
  Send,
  X,
  Plus,
  CheckSquare,
  FileText,
  Trash2,
  Paperclip,
  Download,
  Image as ImageIcon,
  File,
  Check,
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Issue,
  IssueStatus,
  IssueSeverity,
  IssueCategory,
  Comment,
  ChecklistItem,
  Attachment,
  Task,
} from '@/types';
import { teamMembers } from '@/data/mockData';

interface IssueDetailModalProps {
  issue: Issue | null;
  tasks?: Task[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (issue: Issue) => void;
}

const severityOptions: { value: IssueSeverity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-destructive text-destructive-foreground' },
  { value: 'major', label: 'Major', color: 'bg-orange-500 text-white' },
  { value: 'minor', label: 'Minor', color: 'bg-yellow-500 text-black' },
  { value: 'trivial', label: 'Trivial', color: 'bg-muted text-muted-foreground' },
];

const statusOptions: { value: IssueStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'bg-destructive' },
  { value: 'investigating', label: 'Investigating', color: 'bg-orange-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-status-done' },
  { value: 'closed', label: 'Closed', color: 'bg-muted-foreground' },
  { value: 'wont-fix', label: "Won't Fix", color: 'bg-muted-foreground' },
];

const categoryOptions: { value: IssueCategory; label: string; icon: typeof Bug }[] = [
  { value: 'defect', label: 'Defect', icon: Bug },
  { value: 'risk', label: 'Risk', icon: AlertTriangle },
  { value: 'supplier', label: 'Supplier', icon: Truck },
  { value: 'compliance', label: 'Compliance', icon: FileWarning },
  { value: 'test-failure', label: 'Test Failure', icon: FlaskConical },
  { value: 'design-change', label: 'Design Change', icon: Pencil },
  { value: 'other', label: 'Other', icon: Info },
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

export function IssueDetailModal({
  issue,
  tasks = [],
  isOpen,
  onClose,
  onUpdate,
}: IssueDetailModalProps) {
  const [editedIssue, setEditedIssue] = useState<Issue | null>(issue);
  const [newComment, setNewComment] = useState('');
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
  const [selectedBlockingTask, setSelectedBlockingTask] = useState('');
  const [selectedBlockedByTask, setSelectedBlockedByTask] = useState('');
  
  // New state for features
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  useEffect(() => {
    if (issue) {
      setEditedIssue(issue);
    }
  }, [issue]);

  if (!editedIssue) return null;

  const handleFieldChange = <K extends keyof Issue>(field: K, value: Issue[K]) => {
    const updated = { ...editedIssue, [field]: value };
    setEditedIssue(updated);
    onUpdate(updated);
  };

  // Checklist handlers
  const checklist = editedIssue.checklist || [];
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
  const attachments = editedIssue.attachments || [];

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
  const comments = editedIssue.comments || [];

  // Dependencies handlers
  const availableTasksForBlocking = tasks.filter(
    t => !editedIssue.blocksTaskIds?.includes(t.id)
  );
  // Note: Issue interface doesn't strictly have blockedBy yet compared to Task, 
  // but we are adding it to the UI. If the type doesn't support it, we'll map to 'dependencies' or similar 
  // or just use blocksTaskIds as the primary one for now as per "Blocking Items" generic.
  // Actually, we added `dependencies` and `blockedBy` to Issue type earlier.
  
  const availableTasksForBlockedBy = tasks.filter(
    t => !editedIssue.blockedBy?.includes(t.id)
  );

  const handleAddBlockingTask = () => {
    if (!selectedBlockingTask) return;
    const currentBlocks = editedIssue.blocksTaskIds || [];
    handleFieldChange('blocksTaskIds', [...currentBlocks, selectedBlockingTask]);
    setSelectedBlockingTask('');
  };

  const handleRemoveBlockingTask = (taskId: string) => {
    const currentBlocks = editedIssue.blocksTaskIds || [];
    handleFieldChange('blocksTaskIds', currentBlocks.filter(id => id !== taskId));
  };

  const handleAddBlockedByTask = () => {
    if (!selectedBlockedByTask) return;
    const currentBlockedBy = editedIssue.blockedBy || [];
    handleFieldChange('blockedBy', [...currentBlockedBy, selectedBlockedByTask]);
    setSelectedBlockedByTask('');
  };

  const handleRemoveBlockedByTask = (taskId: string) => {
    const currentBlockedBy = editedIssue.blockedBy || [];
    handleFieldChange('blockedBy', currentBlockedBy.filter(id => id !== taskId));
  };

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Badge className={cn(severityOptions.find(s => s.value === editedIssue.severity)?.color)}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {severityOptions.find(s => s.value === editedIssue.severity)?.label}
            </Badge>
            <DialogTitle>Issue Details</DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Title Input (Moved to Body) */}
            <Input
              value={editedIssue.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
              placeholder="Issue title..."
            />

            {/* Issue Overview Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Issue Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Assigned To (Multiple) */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    Assigned To
                  </Label>
                  <div className="min-h-10 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    {(editedIssue.assignees || []).map((assignee) => (
                      <Badge key={assignee.id} variant="secondary" className="pl-1 pr-1.5 gap-1.5 h-6 hover:bg-secondary/80 transition-colors cursor-default">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[9px]">
                            {assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-normal">{assignee.name}</span>
                        <button
                          onClick={() => handleFieldChange('assignees', (editedIssue.assignees || []).filter(a => a.id !== assignee.id))}
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
                                .filter(m => !editedIssue.assignees?.some(a => a.id === m.id))
                                .map((member) => (
                                  <CommandItem
                                    key={member.id}
                                    value={member.name}
                                    onSelect={() => {
                                      handleFieldChange('assignees', [...(editedIssue.assignees || []), member]);
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
                    value={editedIssue.status}
                    onValueChange={(value) => handleFieldChange('status', value as IssueStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', statusOptions.find(s => s.value === editedIssue.status)?.color)} />
                          {statusOptions.find(s => s.value === editedIssue.status)?.label}
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

                {/* Severity */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Severity</Label>
                  <Select
                    value={editedIssue.severity}
                    onValueChange={(value) => handleFieldChange('severity', value as IssueSeverity)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <Badge className={cn('text-xs', severityOptions.find(s => s.value === editedIssue.severity)?.color)}>
                          {severityOptions.find(s => s.value === editedIssue.severity)?.label}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <Badge className={cn('text-xs', option.color)}>{option.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    Category
                  </Label>
                  <Select
                    value={editedIssue.category}
                    onValueChange={(value) => handleFieldChange('category', value as IssueCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(() => {
                          const cat = categoryOptions.find(c => c.value === editedIssue.category);
                          const Icon = cat?.icon || Info;
                          return (
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {cat?.label}
                            </div>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reported Date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-3 w-3" />
                    Reported
                  </Label>
                  <div className="text-sm py-2">
                    {format(new Date(editedIssue.reportedAt), 'PPP')}
                    <span className="text-muted-foreground ml-2">
                      by {editedIssue.reportedBy.name}
                    </span>
                  </div>
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
                          !editedIssue.dueDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedIssue.dueDate
                          ? format(new Date(editedIssue.dueDate), 'PPP')
                          : 'Set due date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedIssue.dueDate ? new Date(editedIssue.dueDate) : undefined}
                        onSelect={(date) => handleFieldChange('dueDate', date?.toISOString())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </section>

            <Separator />

            {/* Description */}
            <section className="space-y-3">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={editedIssue.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Describe the issue in detail..."
                className="min-h-[100px] resize-none"
              />
            </section>

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
                  <p className="text-xs text-muted-foreground">Tasks blocked by this issue</p>

                  <div className="space-y-2">
                    {(editedIssue.blocksTaskIds || []).map((taskId) => {
                      const depTask = getTaskById(taskId);
                       // If task not found (maybe generic ID), display ID fallback
                      const title = depTask ? depTask.title : `Task ${taskId}`;
                      return (
                        <div
                          key={taskId}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                             {depTask && (
                                <div className={cn(
                                  'w-2 h-2 rounded-full',
                                  statusOptions.find(s => s.value === depTask.status as any)?.color 
                                  // casting because IssueStatus and TaskStatus might slightly differ or be same string
                                )} />
                             )}
                            <span className="text-sm truncate">{title}</span>
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
                  <p className="text-xs text-muted-foreground">Tasks blocking this issue</p>

                  <div className="space-y-2">
                    {(editedIssue.blockedBy || []).map((taskId) => {
                      const depTask = getTaskById(taskId);
                      const title = depTask ? depTask.title : `Task ${taskId}`;
                      return (
                        <div
                          key={taskId}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {depTask && (
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                statusOptions.find(s => s.value === depTask.status as any)?.color
                              )} />
                            )}
                            <span className="text-sm truncate">{title}</span>
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

            {/* Resolution (if resolved) */}
            {(editedIssue.status === 'resolved' || editedIssue.status === 'closed') && (
              <>
                <Separator />
                <section className="space-y-3">
                  <Label className="text-sm font-medium text-status-done">Resolution</Label>
                  <Textarea
                    value={editedIssue.resolution || ''}
                    onChange={(e) => handleFieldChange('resolution', e.target.value)}
                    placeholder="Describe how this issue was resolved..."
                    className="min-h-[80px] resize-none"
                  />
                </section>
              </>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Tags
              </Label>
              <div className="min-h-10 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                {(editedIssue.tags || []).map((tag) => (
                  <Badge 
                    key={tag} 
                    className={cn("text-xs font-normal pointer-events-none pl-2 pr-1 gap-1", getTagColor(tag))}
                  >
                    {tag}
                    <button
                      onClick={() => handleFieldChange('tags', (editedIssue.tags || []).filter(t => t !== tag))}
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
                                    handleFieldChange('tags', [...(editedIssue.tags || []), tagSearch.trim()]);
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
                          .filter(item => !(editedIssue.tags || []).includes(item.name)) // Simple filter by name
                          .map((item, index) => (
                            <CommandItem
                              key={index}
                              value={item.name}
                              onSelect={() => {
                                if (editingTagIndex !== index) {
                                  handleFieldChange('tags', [...(editedIssue.tags || []), item.name]);
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
                                          handleFieldChange('tags', [...(editedIssue.tags || []), editingTagValue.trim()]);
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
                                          handleFieldChange('tags', [...(editedIssue.tags || []), editingTagValue.trim()]);
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
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="h-5 w-5" />
                        <span className="text-sm font-medium">Add Attachment</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                    </div>
                    <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </section>

            <Separator />

            {/* Comments */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h3>

              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
