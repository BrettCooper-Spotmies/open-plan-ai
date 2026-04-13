import { useState, useMemo, useEffect } from 'react';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
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
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';
import { attachmentsService } from '@/services/attachments.service';
import { commentsService } from '@/services/comments.service';
import { useNotifications } from '@/hooks/useNotifications';
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
import { useOrganizationMembers } from '@/hooks/useProjectTeam';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Utility function to convert Date to YYYY-MM-DD format (date-only, no timezone shift)
const toDateOnly = (date: Date | undefined | null): string | undefined => {
  if (!date) return undefined;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface TaskDetailModalProps {
  task: Task | null;
  allTasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => Promise<void> | void;
  onBatchUpdate?: (updates: Array<{ id: string; updates: Partial<Task> }>) => Promise<void> | void;
  onDelete?: (taskId: string) => void;
  mode?: 'view' | 'create';
  onCreate?: (task: Task) => void;
  modules?: { id: string; name: string; type: ModuleType }[];
  projectId?: string;
  onAddModule?: () => void;
  assignableMembers?: TeamMember[];
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

const serializeTaskForDirtyCheck = (task: Task): string => {
  const attachmentSnapshot = (task.attachments || [])
    .map(a => ({
      id: a.id,
      filename: a.filename,
      fileType: a.fileType,
      fileSize: a.fileSize,
      url: a.url,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return JSON.stringify({
    title: task.title || '',
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    module: task.module || null,
    moduleId: task.moduleId || null,
    moduleIds: [...(task.moduleIds || [])].sort(),
    dueDate: task.dueDate || null,
    startDate: task.startDate || null,
    assigneeIds: (task.assignees || []).map(a => a.id).sort(),
    tags: [...(task.tags || [])].sort(),
    checklist: (task.checklist || []).map(item => ({
      id: item.id,
      text: item.text,
      completed: item.completed,
    })),
    blockedBy: [...(task.blockedBy || [])].sort(),
    attachments: attachmentSnapshot,
  });
};

export const TaskDetailModal = ({
  task,
  allTasks,
  isOpen,
  onClose,
  onUpdate,
  onBatchUpdate,
  onDelete,
  mode = 'view',
  onCreate,
  modules = [],
  projectId,
  onAddModule,
  assignableMembers,
}: TaskDetailModalProps) => {
  const { profile } = useAuth();
  const { currentOrganization } = useOrganization();
  const { data: organizationMembers = [] } = useOrganizationMembers(currentOrganization?.id);
  const { createNotification } = useNotifications();
  const availableAssignees = assignableMembers ?? organizationMembers;
  const [editedTask, setEditedTask] = useState<Task>(task || {
    id: '',
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    module: '' as ModuleType,
    assignees: [],
    tags: [],
    checklist: [],
    blockedBy: [],
    comments: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [, setIsLoadingComments] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedBlockingTask, setSelectedBlockingTask] = useState<string>('');
  const [selectedBlockedByTask, setSelectedBlockedByTask] = useState<string>('');
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
  const [isModulePopoverOpen, setIsModulePopoverOpen] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialTaskSnapshot, setInitialTaskSnapshot] = useState('');
  const [initialBlockedByIds, setInitialBlockedByIds] = useState<string[]>([]);
  const [initialBlockingToIds, setInitialBlockingToIds] = useState<string[]>([]);
  const [initializedForKey, setInitializedForKey] = useState<string | null>(null);
  const formSessionKey = `${mode}:${task?.id || 'create'}`;

  // Fetch real comments when task changes
  useEffect(() => {
    if (isOpen && task?.id && mode !== 'create') {
      setIsLoadingComments(true);
      commentsService.getByEntity(task.id, 'task')
        .then(dbComments => {
          const mappedComments: Comment[] = dbComments.map(c => ({
            id: c.id,
            content: c.content,
            author: {
              id: c.profiles?.id || c.author_id,
              name: c.profiles?.name || 'Unknown',
              initials: c.profiles?.initials || 'UN',
              avatar: c.profiles?.avatar_url || undefined,
              email: c.profiles?.email || '',
              role: 'member'
            },
            createdAt: c.created_at || new Date().toISOString(),
          }));
          setEditedTask(prev => ({ ...prev, comments: mappedComments }));
        })
        .finally(() => setIsLoadingComments(false));
    }
  }, [isOpen, task?.id, mode]);

  // Initialize form baselines once per modal session key
  useEffect(() => {
    if (!isOpen) {
      setInitializedForKey(null);
      return;
    }

    if (initializedForKey === formSessionKey) {
      return;
    }

    const baseTask = task || editedTask;
    setEditedTask(baseTask);
    setInitialTaskSnapshot(serializeTaskForDirtyCheck(baseTask));
    
    // Track initial blocked by items
    setInitialBlockedByIds(baseTask.blockedBy || []);

    const linkedTaskIds = baseTask.id
      ? allTasks.filter(t => t.blockedBy.includes(baseTask.id)).map(t => t.id)
      : [];

    setLocalBlockingToIds(linkedTaskIds);
    setInitialBlockingToIds(linkedTaskIds);
    setInitializedForKey(formSessionKey);
  }, [allTasks, editedTask, formSessionKey, initializedForKey, isOpen, task]);

  // "Blocking To" - tasks that have THIS task in their blockedBy.
  // We maintain a local copy to update immediately without waiting for allTasks prop to refresh.
  const [localBlockingToIds, setLocalBlockingToIds] = useState<string[]>([]);

  const blockingToTaskIds = localBlockingToIds;
  const dependencyExcludedTaskIds = useMemo(() => new Set([
    editedTask.id,
    ...editedTask.blockedBy,
    ...blockingToTaskIds,
  ]), [blockingToTaskIds, editedTask.blockedBy, editedTask.id]);

  const handleFieldChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    setEditedTask(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleStatusChange = (value: TaskStatus) => {
    if (value === 'blocked') {
      const hasDependencies =
        (editedTask.blockedBy?.length || 0) > 0 ||
        localBlockingToIds.length > 0 ||
        (editedTask.linkedIssueIds?.length || 0) > 0;

      if (!hasDependencies) {
        toast.error('Blocked selected. Please add dependencies before saving.');
      }
    }

    handleFieldChange('status', value);
  };

  const handleCancel = () => {
    // Reset local edits back to original task from props
    if (task) {
      setEditedTask(task);
    }
    onClose();
  };

  const handleCreate = () => {
    if (!editedTask.moduleIds || editedTask.moduleIds.length === 0) {
      return;
    }

    if (isBlockedWithoutDependencies) {
      toast.error('Please add dependencies before creating a blocked task');
      return;
    }

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
        const uploadedBy: TeamMember = profile ? {
          id: profile.id,
          name: profile.name || profile.email,
          email: profile.email,
          initials: profile.initials,
          avatar: profile.avatar_url || undefined,
          role: profile.role || 'member'
        } : {
          id: 'unknown',
          name: 'Unknown',
          email: '',
          initials: 'UN',
          role: 'member',
        };

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

  const hasSelectedModules = (editedTask.moduleIds || []).length > 0;
  const normalizedEditedTaskSnapshot = useMemo(
    () => serializeTaskForDirtyCheck(editedTask),
    [editedTask]
  );
  const sortedCurrentBlockingToIds = useMemo(
    () => [...localBlockingToIds].sort(),
    [localBlockingToIds]
  );
  const sortedInitialBlockingToIds = useMemo(
    () => [...initialBlockingToIds].sort(),
    [initialBlockingToIds]
  );
  const hasBlockingToChanges = useMemo(() => {
    if (sortedCurrentBlockingToIds.length !== sortedInitialBlockingToIds.length) {
      return true;
    }

    return sortedCurrentBlockingToIds.some((id, idx) => id !== sortedInitialBlockingToIds[idx]);
  }, [sortedCurrentBlockingToIds, sortedInitialBlockingToIds]);
  
  // Check if blockedBy has changed
  const hasBlockedByChanges = useMemo(() => {
    const current = [...(editedTask.blockedBy || [])].sort();
    const initial = [...initialBlockedByIds].sort();
    if (current.length !== initial.length) return true;
    return current.some((id, idx) => id !== initial[idx]);
  }, [editedTask.blockedBy, initialBlockedByIds]);
  
  const hasDependenciesForBlocked =
    (editedTask.blockedBy?.length || 0) > 0 ||
    localBlockingToIds.length > 0 ||
    (editedTask.linkedIssueIds?.length || 0) > 0;
  const isBlockedWithoutDependencies = editedTask.status === 'blocked' && !hasDependenciesForBlocked;
  const isTaskDirty = initialTaskSnapshot !== '' && normalizedEditedTaskSnapshot !== initialTaskSnapshot;
  const isFormDirty = isTaskDirty || hasBlockingToChanges || hasBlockedByChanges;
  const canSubmitTask = Boolean(
    editedTask.title &&
      editedTask.dueDate &&
      hasSelectedModules &&
      !isBlockedWithoutDependencies &&
      (mode === 'create' || isFormDirty)
  );

  // Comments handlers
  const comments = editedTask.comments || [];

  const handleAddComment = async () => {
    if (!newComment.trim() || !profile) return;

    const content = newComment.trim();
    setNewComment('');

    // If in view mode, persist to DB immediately
    if (mode !== 'create' && editedTask.id) {
      try {
        const dbComment = await commentsService.create({
          author_id: profile.id,
          content: content,
          entity_id: editedTask.id,
          entity_type: 'task',
        });

        const newCommentObj: Comment = {
          id: dbComment.id,
          content: dbComment.content,
          author: {
            id: profile.id,
            name: profile.name || profile.email,
            initials: profile.initials,
            avatar: profile.avatar_url || undefined,
            email: profile.email,
            role: profile.role || 'member'
          },
          createdAt: dbComment.created_at || new Date().toISOString(),
        };

        setEditedTask(prev => ({
          ...prev,
          comments: [...(prev.comments || []), newCommentObj]
        }));

        // Send notifications to all other assignees
        const otherAssignees = (editedTask.assignees || []).filter(a => a.id !== profile.id);

        for (const assignee of otherAssignees) {
          createNotification.mutate({
            user_id: assignee.id,
            actor_id: profile.id,
            type: 'comment',
            title: 'New Comment',
            description: `${profile.name || 'Someone'} commented on "${editedTask.title}"`,
            project_id: projectId,
            entity_id: editedTask.id,
            entity_type: 'task',
          });
        }
      } catch (error) {
        console.error('Failed to add comment:', error);
        setNewComment(content); // Restore content on error
      }
    } else {
      // Just update local state for new tasks
      const newCommentObj: Comment = {
        id: `comment-${Date.now()}`,
        content: content,
        author: {
          id: profile.id,
          name: profile.name || profile.email,
          initials: profile.initials,
          avatar: profile.avatar_url || undefined,
          email: profile.email,
          role: profile.role || 'member'
        },
        createdAt: new Date().toISOString(),
      };
      setEditedTask(prev => ({
        ...prev,
        comments: [...(prev.comments || []), newCommentObj]
      }));
    }
  };
  const availableTasksForBlocking = allTasks.filter(
    t => !dependencyExcludedTaskIds.has(t.id)
  );
  const availableTasksForBlockedBy = allTasks.filter(
    t => !dependencyExcludedTaskIds.has(t.id)
  );


  // Adding to "Blocking To" - update the OTHER task's blockedBy and update local state
  const handleAddBlockingTask = () => {
    if (!selectedBlockingTask) return;
    const taskToUpdate = allTasks.find(t => t.id === selectedBlockingTask);
    if (taskToUpdate && !dependencyExcludedTaskIds.has(selectedBlockingTask)) {
      setLocalBlockingToIds(prev => [...prev, selectedBlockingTask]);
    }
    setSelectedBlockingTask('');
  };

  const handleUpdateTask = async () => {
    if (isBlockedWithoutDependencies) {
      toast.error('Please add dependencies before saving blocked status');
      return;
    }

    setIsSaving(true);
    try {
      // Commit the main task changes
      await onUpdate(editedTask);

      // Compute blocking-to diffs: tasks where THIS task is listed in their blockedBy
      const originalBlockingToIds = allTasks
        .filter(t => t.blockedBy.includes(editedTask.id))
        .map(t => t.id);

      // Compute blockedBy diffs: tasks that THIS task depends on
      const originalBlockedByIds = editedTask.id 
        ? allTasks.find(t => t.id === editedTask.id)?.blockedBy || []
        : [];

      // addedIds/removedIds logic...
      const batchUpdates: Array<{ id: string; updates: Partial<Task> }> = [];

      // Added blocking-to relationships
      const addedIds = localBlockingToIds.filter(id => !originalBlockingToIds.includes(id));
      for (const id of addedIds) {
        const other = allTasks.find(t => t.id === id);
        if (other && !other.blockedBy.includes(editedTask.id)) {
          batchUpdates.push({
            id,
            updates: { 
              blockedBy: [...other.blockedBy, editedTask.id],
              status: other.status === 'blocked' ? other.status : 'blocked'
            }
          });
        }
      }

      // Removed blocking-to relationships
      const removedIds = originalBlockingToIds.filter(id => !localBlockingToIds.includes(id));
      for (const id of removedIds) {
        const other = allTasks.find(t => t.id === id);
        if (other) {
          const newBlockedBy = other.blockedBy.filter(bid => bid !== editedTask.id);
          batchUpdates.push({
            id,
            updates: { 
              blockedBy: newBlockedBy,
              // If no more blockers, change status back to 'todo'
              status: newBlockedBy.length === 0 && other.status === 'blocked' ? 'todo' : other.status
            }
          });
        }
      }

      // Added blockedBy relationships (THIS task's dependencies)
      const addedBlockedByIds = editedTask.blockedBy.filter(id => !(originalBlockedByIds || []).includes(id));
      for (const id of addedBlockedByIds) {
        const blocker = allTasks.find(t => t.id === id);
        if (blocker) {
          batchUpdates.push({
            id,
            updates: { 
              status: blocker.status === 'blocked' ? blocker.status : 'blocked'
            }
          });
        }
      }

      // Removed blockedBy relationships
      const removedBlockedByIds = (originalBlockedByIds || []).filter(id => !editedTask.blockedBy.includes(id));
      for (const id of removedBlockedByIds) {
        const blocker = allTasks.find(t => t.id === id);
        if (blocker && blocker.status === 'blocked') {
          // Only change status if this blocker doesn't block anything else
          const blockingOthers = allTasks.some(t => t.blockedBy.includes(id));
          if (!blockingOthers) {
            batchUpdates.push({
              id,
              updates: { status: 'todo' }
            });
          }
        }
      }

      if (batchUpdates.length > 0) {
        if (onBatchUpdate) {
          await onBatchUpdate(batchUpdates);
        } else {
          // Fallback to sequential if onBatchUpdate is not provided
          for (const update of batchUpdates) {
            const other = allTasks.find(t => t.id === update.id);
            if (other) {
              await onUpdate({ ...other, ...update.updates });
            }
          }
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Removing from "Blocking To" - will be handled in batch updates
  const handleRemoveBlockingTask = (taskId: string) => {
    setLocalBlockingToIds(prev => {
      const updated = prev.filter(id => id !== taskId);
      // If removing this leaves no blocking tasks and no blocked-by tasks, change status to 'todo'
      if (updated.length === 0 && editedTask.blockedBy.length === 0 && editedTask.status === 'blocked') {
        setEditedTask(prevTask => ({
          ...prevTask,
          status: 'todo',
          updatedAt: new Date().toISOString()
        }));
      }
      return updated;
    });
  };

  // Adding to "Blocked By" - update THIS task's blockedBy
  const handleAddBlockedByTask = () => {
    if (!selectedBlockedByTask) return;
    setEditedTask(prev => {
      // Prevent duplicates
      if (dependencyExcludedTaskIds.has(selectedBlockedByTask)) return prev;

      const updated = {
        ...prev,
        blockedBy: [...prev.blockedBy, selectedBlockedByTask],
        updatedAt: new Date().toISOString()
      };
      return updated;
    });
    setSelectedBlockedByTask('');
  };

  // Removing from "Blocked By" - will be handled in batch updates
  const handleRemoveBlockedByTask = (taskId: string) => {
    setEditedTask(prev => {
      const updatedBlockedBy = prev.blockedBy.filter(id => id !== taskId);
      const updated = {
        ...prev,
        blockedBy: updatedBlockedBy,
        updatedAt: new Date().toISOString()
      };
      // If removing this leaves no blocked-by tasks and no blocking tasks, change status to 'todo'
      if (updatedBlockedBy.length === 0 && localBlockingToIds.length === 0 && prev.status === 'blocked') {
        updated.status = 'todo';
      }
      return updated;
    });
  };

  const getTaskById = (id: string) => {
    const taskFound = allTasks.find(t => t.id === id);
    if (!taskFound) {
      console.warn(`Task with ID ${id} not found in allTasks`);
    }
    return taskFound;
  };

  const handleDelete = () => {
    if (onDelete && editedTask && editedTask.id) {
      onDelete(editedTask.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] w-[95vw] sm:w-full p-0 gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-4 sm:px-6 py-4 border-b">
          <DialogTitle>{mode === 'create' ? 'Add New Task' : 'Task Details'}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          View and edit details for task {task?.title || 'New Task'}
        </DialogDescription>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-4 sm:p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task Title <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Input
                value={editedTask.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                placeholder="Task title..."
                aria-required="true"
              />
            </div>

            {/* Task Overview Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Task Overview
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assignees */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    Assigned To
                  </Label>
                  <div
                    className="min-h-10 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setIsAssigneePopoverOpen(true)}
                  >
                    {(editedTask.assignees || []).map((assignee) => (
                      <Badge key={assignee.id} variant="secondary" className="pl-1 pr-1.5 gap-1.5 h-6 hover:bg-secondary/80 transition-colors cursor-default">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[9px]">
                            {assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-normal">{assignee.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFieldChange('assignees', (editedTask.assignees || []).filter(a => a.id !== assignee.id));
                          }}
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
                            <CommandGroup heading="Members">
                              {availableAssignees
                                .filter(m => !editedTask.assignees?.some(a => a.id === m.id))
                                .map((member) => (
                                  <CommandItem
                                    key={member.id}
                                    value={`${member.id} ${member.name}`}
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
                    Status <span className="text-destructive" aria-hidden="true">*</span>
                  </Label>
                  <Select
                    value={editedTask.status}
                    onValueChange={(value) => handleStatusChange(value as TaskStatus)}
                  >
                    <SelectTrigger aria-required="true">
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
                  <Label className="text-xs text-muted-foreground">Priority <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <Select
                    value={editedTask.priority}
                    onValueChange={(value) => handleFieldChange('priority', value as Priority)}
                  >
                    <SelectTrigger aria-required="true">
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

                {/* Module Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    Modules <span className="text-destructive">*</span>
                  </Label>
                  <div
                    className="min-h-10 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setIsModulePopoverOpen(true)}
                  >
                    {(editedTask.moduleIds || []).length === 0 && (
                      <span className="text-muted-foreground">Select modules...</span>
                    )}
                    {(editedTask.moduleIds || []).map((moduleId) => {
                      const module = modules?.find(m => m.id === moduleId);
                      if (!module) return null;
                      return (
                        <Badge key={module.id} variant="secondary" className="max-w-full px-2 py-0.5 gap-1.5 h-6 hover:bg-secondary/80 transition-colors cursor-default">
                          <span className="text-xs font-normal truncate max-w-[180px] sm:max-w-[220px]">{module.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updatedIds = (editedTask.moduleIds || []).filter(id => id !== module.id);
                              setEditedTask(prev => ({
                                ...prev,
                                moduleIds: updatedIds,
                                moduleId: updatedIds[0] || undefined,
                                module: updatedIds.length > 0
                                  ? (modules.find(m => m.id === updatedIds[0])?.type || prev.module)
                                  : undefined,
                                updatedAt: new Date().toISOString()
                              }));
                            }}
                            className="ml-auto text-muted-foreground hover:text-foreground transition-colors outline-none"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    <Popover open={isModulePopoverOpen} onOpenChange={setIsModulePopoverOpen}>
                      <PopoverTrigger asChild>
                        <button className="h-6 w-6 rounded-full p-0 border border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary hover:text-primary transition-all bg-transparent shadow-none focus:ring-0 [&>svg]:hidden flex items-center justify-center">
                          <span>
                            <Plus className="h-3 w-3" />
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[240px]" align="start">
                        <Command>
                          <CommandInput placeholder="Search modules..." />
                          <CommandList>
                            <CommandEmpty className="py-2 px-2">
                              <div className="text-sm text-center py-2 text-muted-foreground">
                                No modules found.
                              </div>
                              {onAddModule && (
                                <button
                                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                                  onClick={() => {
                                    onAddModule();
                                    setIsModulePopoverOpen(false);
                                  }}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Create New Module
                                </button>
                              )}
                            </CommandEmpty>
                            <CommandGroup heading="Available Modules">
                              {modules
                                .filter(m => !(editedTask.moduleIds || []).includes(m.id))
                                .map((module) => (
                                  <CommandItem
                                    key={module.id}
                                    value={module.name}
                                    onSelect={() => {
                                      // If this is the first module, also set the primary module type for compatibility
                                      const isFirst = (editedTask.moduleIds || []).length === 0;
                                      const updatedIds = [...(editedTask.moduleIds || []), module.id];

                                      setEditedTask(prev => {
                                        const updated = {
                                          ...prev,
                                          moduleIds: updatedIds,
                                          moduleId: isFirst ? module.id : prev.moduleId,
                                          module: isFirst ? module.type : prev.module,
                                          updatedAt: new Date().toISOString()
                                        };
                                        onUpdate(updated);
                                        return updated;
                                      });
                                      setIsModulePopoverOpen(false);
                                    }}
                                    className="cursor-pointer min-w-0"
                                  >
                                    <div className="flex flex-col min-w-0 w-full">
                                      <span className="truncate block">{module.name}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase truncate block">{module.type}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            {onAddModule && (
                              <>
                                <Separator />
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      onAddModule();
                                      setIsModulePopoverOpen(false);
                                    }}
                                    className="cursor-pointer text-primary"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Module
                                  </CommandItem>
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
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
                        onSelect={(date) => handleFieldChange('startDate', toDateOnly(date || undefined))}
                        disabled={{ before: startOfToday() }}
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
                    Due Date <span className="text-destructive" aria-hidden="true">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        aria-required="true"
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
                        onSelect={(date) => handleFieldChange('dueDate', toDateOnly(date || undefined))}
                        disabled={(date) => {
                          const today = startOfToday();
                          if (isBefore(date, today)) return true;
                          if (editedTask.startDate) {
                            return isBefore(date, parseISO(editedTask.startDate));
                          }
                          return false;
                        }}
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
                <div
                  className="min-h-10 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setIsTagPopoverOpen(true)}
                >
                  {editedTask.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className={cn("text-xs font-normal pointer-events-none pl-2 pr-1 gap-1", getTagColor(tag))}
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldChange('tags', editedTask.tags.filter(t => t !== tag));
                        }}
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
                    <PopoverContent className="p-0 w-[240px]" align="start" onWheel={(e) => e.stopPropagation()}>
                      <Command>
                        <CommandInput
                          placeholder="Search tags..."
                          value={tagSearch}
                          onValueChange={setTagSearch}
                        />
                        <CommandList>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Blocking To */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-priority-high" />
                    <Label className="text-xs font-medium">Blocking To</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Tasks that depend on this task</p>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select value={selectedBlockingTask} onValueChange={setSelectedBlockingTask}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasksForBlocking.length === 0 ? (
                            <SelectItem value="__no_tasks_blocking__" disabled>
                              No tasks registered yet.
                            </SelectItem>
                          ) : (
                            availableTasksForBlocking.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={handleAddBlockingTask}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

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
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleRemoveBlockingTask(taskId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
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
                    <div className="flex gap-2">
                      <Select value={selectedBlockedByTask} onValueChange={setSelectedBlockedByTask}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasksForBlockedBy.length === 0 ? (
                            <SelectItem value="__no_tasks_blocked_by__" disabled>
                              No tasks registered yet.
                            </SelectItem>
                          ) : (
                            availableTasksForBlockedBy.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={handleAddBlockedByTask}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

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
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleRemoveBlockedByTask(taskId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
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
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex justify-end gap-2 bg-background">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canSubmitTask}>
              Create Task
            </Button>
          </div>
        )}
        {mode === 'view' && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex items-center justify-between gap-2 bg-background">
            {/* Delete button on the bottom left */}
            {onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTask} disabled={isSaving || !editedTask.title || !editedTask.dueDate || !isFormDirty || isBlockedWithoutDependencies}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Task
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </Dialog>
  );
}