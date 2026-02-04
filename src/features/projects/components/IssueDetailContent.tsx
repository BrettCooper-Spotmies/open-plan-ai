import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    Maximize2,
    MoreVertical,
    Loader2,
    Upload,
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
    TeamMember,
} from '@/types';
import { SlashBlockEditor, EditorBlock } from '@/components/ui/SlashBlockEditor';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { attachmentsService } from '@/services/attachments.service';
import { toast } from 'sonner';

interface IssueDetailContentProps {
    issue: Issue | null;
    tasks?: Task[];
    teamMembers?: TeamMember[];
    onUpdate: (issue: Issue) => void;
    onDelete?: (issueId: string) => void;
    onExpand?: () => void; // Optional expanded view action
    isExpanded?: boolean;
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

const getTagColor = (tag: string) => {
    const directMatch = TAG_PALETTE.find(p => p.name.toLowerCase() === tag.toLowerCase());
    if (directMatch) return directMatch.color;
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

export function IssueDetailContent({
    issue,
    tasks = [],
    teamMembers = [],
    onUpdate,
    onDelete,
    onExpand,
    isExpanded = false,
}: IssueDetailContentProps) {
    const [editedIssue, setEditedIssue] = useState<Issue | null>(issue);
    const [newComment, setNewComment] = useState('');
    const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
    const [selectedBlockingTask, setSelectedBlockingTask] = useState('');
    const [selectedBlockedByTask, setSelectedBlockedByTask] = useState('');
    const [isAdvancedDescription, setIsAdvancedDescription] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
    const [editingTagValue, setEditingTagValue] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (issue) {
            setEditedIssue(issue);
            // Auto-enable advanced description if blocks exist
            if (issue.descriptionBlocks && issue.descriptionBlocks.length > 0) {
                setIsAdvancedDescription(true);
            }
        }
    }, [issue]);

    if (!editedIssue) return null;

    const handleFieldChange = <K extends keyof Issue>(field: K, value: Issue[K]) => {
        const updated = { ...editedIssue, [field]: value };
        setEditedIssue(updated);
        // We now rely on the explicit "Save Changes" button
    };

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

    const attachments = editedIssue.attachments || [];
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newAttachments: Attachment[] = [];

            for (const file of Array.from(files)) {
                // Generate a unique path for the file
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `${editedIssue.projectId || 'issues'}/${fileName}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('project-files')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    toast.error(`Failed to upload ${file.name}`);
                    continue;
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('project-files')
                    .getPublicUrl(filePath);

                // Create attachment record in database
                let attachmentId = `temp-${Date.now()}-${Math.random()}`;

                try {
                    const dbAttachment = await attachmentsService.create({
                        entity_id: editedIssue.id,
                        entity_type: 'issue',
                        file_name: file.name,
                        file_path: filePath,
                        file_size: file.size,
                        mime_type: file.type,
                        project_id: editedIssue.projectId,
                    });
                    attachmentId = dbAttachment.id;
                } catch (dbError) {
                    console.error('Error creating attachment record:', dbError);
                }

                const attachment: Attachment = {
                    id: attachmentId,
                    filename: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    uploadedBy: teamMembers[0] || { id: 'unknown', name: 'Unknown User', initials: 'UN', email: '', role: 'member' },
                    uploadedAt: new Date().toISOString(),
                    url: publicUrl,
                };

                newAttachments.push(attachment);
            }

            handleFieldChange('attachments', [...attachments, ...newAttachments]);
            toast.success('Files uploaded successfully');
        } catch (error) {
            console.error('File upload error:', error);
            toast.error('Failed to upload files');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAttachment = (attachmentId: string) => {
        handleFieldChange('attachments', attachments.filter(a => a.id !== attachmentId));
    };

    const comments = editedIssue.comments || [];

    const availableTasksForBlocking = tasks.filter(
        t => !editedIssue.blocksTaskIds?.includes(t.id)
    );

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
            author: teamMembers[0] || { id: 'unknown', name: 'Unknown User', initials: 'UN', email: '', role: 'member' },
            createdAt: new Date().toISOString(),
        };
        handleFieldChange('comments', [...comments, newCommentObj]);
        setNewComment('');
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header with Title and Metadata */}
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <Input
                            value={editedIssue.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            className="text-2xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                            placeholder="Issue title..."
                        />
                    </div>
                    {/* Severity Badge and Actions on the right */}
                    <div className="flex-shrink-0 pt-1">
                        <div className="flex items-center gap-2">
                            <Badge className={cn(severityOptions.find(s => s.value === editedIssue.severity)?.color)}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {severityOptions.find(s => s.value === editedIssue.severity)?.label}
                            </Badge>
                            {!isExpanded && onExpand && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onExpand}>
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                            )}
                            {onDelete && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this issue?')) {
                                                    onDelete(editedIssue.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Issue
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Assigned To */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                Assigned To
                            </Label>
                            <div className="min-h-9 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm">
                                {(editedIssue.assignees || []).map((assignee) => (
                                    <Badge key={assignee.id} variant="secondary" className="pl-1 pr-1.5 gap-1.5 h-6 cursor-default">
                                        <Avatar className="h-4 w-4">
                                            <AvatarFallback className="text-[9px]">{assignee.initials}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-normal">{assignee.name}</span>
                                        <button
                                            onClick={() => handleFieldChange('assignees', (editedIssue.assignees || []).filter(a => a.id !== assignee.id))}
                                            className="ml-auto text-muted-foreground hover:text-foreground outline-none"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                                <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="h-6 w-6 rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center transition-colors">
                                            <Plus className="h-3 w-3" />
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
                                                                <Avatar className="h-5 w-5 mr-2">
                                                                    <AvatarFallback className="text-[9px]">{member.initials}</AvatarFallback>
                                                                </Avatar>
                                                                {member.name}
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
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <AlertCircle className="h-3 w-3" />
                                Status
                            </Label>
                            <Select
                                value={editedIssue.status}
                                onValueChange={(value) => handleFieldChange('status', value as IssueStatus)}
                            >
                                <SelectTrigger className="h-9">
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

                        {/* Reported Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <CalendarIcon className="h-3 w-3" />
                                Reported
                            </Label>
                            <div className="text-sm py-2 px-3 h-9 flex items-center border rounded-md bg-muted/20 text-muted-foreground">
                                {format(new Date(editedIssue.reportedAt), 'PPP')}
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <CalendarIcon className="h-3 w-3" />
                                Due Date
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal h-9 px-3',
                                            !editedIssue.dueDate && 'text-muted-foreground'
                                        )}
                                    >
                                        {editedIssue.dueDate
                                            ? format(new Date(editedIssue.dueDate), 'PPP')
                                            : 'Set date'}
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

                        {/* Reported By */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                Reported By
                            </Label>
                            <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/20">
                                <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[9px]">
                                        {editedIssue.reportedBy.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{editedIssue.reportedBy.name}</span>
                            </div>
                        </div>

                        {/* Severity */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3" />
                                Severity
                            </Label>
                            <Select
                                value={editedIssue.severity}
                                onValueChange={(value) => handleFieldChange('severity', value as IssueSeverity)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue>
                                        <Badge className={cn('text-xs gap-1', severityOptions.find(s => s.value === editedIssue.severity)?.color)}>
                                            <AlertTriangle className="h-3 w-3" />
                                            {severityOptions.find(s => s.value === editedIssue.severity)?.label}
                                        </Badge>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {severityOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <Badge className={cn('text-xs gap-1', option.color)}>
                                                <AlertTriangle className="h-3 w-3" />
                                                {option.label}
                                            </Badge>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Tag className="h-3 w-3" />
                                Category
                            </Label>
                            <Select
                                value={editedIssue.category}
                                onValueChange={(value) => handleFieldChange('category', value as IssueCategory)}
                            >
                                <SelectTrigger className="h-9">
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
                                    {categoryOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div className="flex items-center gap-2">
                                                <option.icon className="h-4 w-4" />
                                                {option.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tags (Span 2 columns) */}
                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Tag className="h-3 w-3" />
                                Tags
                            </Label>
                            <div className="min-h-9 flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm">
                                {(editedIssue.tags || []).map((tag) => (
                                    <Badge
                                        key={tag}
                                        className={cn("text-xs font-normal pl-2 pr-1 gap-1", getTagColor(tag))}
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleFieldChange('tags', (editedIssue.tags || []).filter(t => t !== tag))}
                                            className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
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
                                        <button className="h-6 w-6 rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center transition-colors">
                                            <Plus className="h-3 w-3" />
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
                                                    .filter(item => !(editedIssue.tags || []).includes(item.name))
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
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("w-3 h-3 rounded-full shrink-0", item.color.split(' ')[0])} />
                                                                <span>{item.name}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Description Editor (Full Width) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Description</Label>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="advanced-mode" className="text-xs text-muted-foreground cursor-pointer">Advanced Editor</Label>
                                <Switch
                                    id="advanced-mode"
                                    checked={isAdvancedDescription}
                                    onCheckedChange={setIsAdvancedDescription}
                                />
                            </div>
                        </div>

                        {isAdvancedDescription ? (
                            <div className="min-h-[200px] border rounded-md p-4 bg-background">
                                <SlashBlockEditor
                                    key={editedIssue.id}
                                    initialBlocks={editedIssue.descriptionBlocks}
                                    onChange={(blocks) => handleFieldChange('descriptionBlocks', blocks)}
                                />
                            </div>
                        ) : (
                            <Textarea
                                value={editedIssue.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                placeholder="Describe the issue in detail..."
                                className="min-h-[150px] resize-none"
                            />
                        )}
                    </div>

                    {/* Checklist (Full Width) */}
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

                    {/* Attachments (Full Width) */}
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
                                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="flex items-center justify-center w-full">
                                <label className={cn(
                                    "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors",
                                    isUploading && "opacity-50 pointer-events-none"
                                )}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            {isUploading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Upload className="h-5 w-5" />
                                            )}
                                            <span className="text-sm font-medium">
                                                {isUploading ? 'Uploading...' : 'Add Attachment'}
                                            </span>
                                        </div>
                                        {!isUploading && <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>}
                                    </div>
                                    <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Dependencies (2 Columns) */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Link2 className="h-4 w-4" />
                            Dependencies
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    {/* Comments (Full Width) */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Comments ({comments.length})
                        </h3>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
                            <Textarea
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="min-h-[80px]"
                            />
                            <Button className="h-auto" onClick={handleAddComment} disabled={!newComment.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </section>

                    {/* Action Bar */}
                    <div className="pt-6 border-t flex items-center justify-between">
                        <div className="text-xs text-muted-foreground italic">
                            {isSaving ? 'Saving changes...' : 'Last updated ' + format(new Date(), 'h:mm a')}
                        </div>
                        <div className="flex gap-3">
                            {onExpand && !isExpanded && (
                                <Button variant="outline" onClick={onExpand}>
                                    <Maximize2 className="h-4 w-4 mr-2" />
                                    Full Page
                                </Button>
                            )}
                            <Button
                                onClick={async () => {
                                    setIsSaving(true);
                                    try {
                                        await onUpdate(editedIssue);
                                        toast.success('Issue updated successfully');
                                    } catch (err) {
                                        toast.error('Failed to update issue');
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving || isUploading}
                                className="min-w-[120px]"
                            >
                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>





            </div>
        </div>
    );
}
