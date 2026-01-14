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
} from 'lucide-react';
import {
  Issue,
  IssueStatus,
  IssueSeverity,
  IssueCategory,
  Comment,
} from '@/types';
import { teamMembers } from '@/data/mockData';

interface IssueDetailModalProps {
  issue: Issue | null;
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

export function IssueDetailModal({
  issue,
  isOpen,
  onClose,
  onUpdate,
}: IssueDetailModalProps) {
  const [editedIssue, setEditedIssue] = useState<Issue | null>(issue);
  const [newComment, setNewComment] = useState('');

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

  // Comments handlers
  const comments = editedIssue.comments || [];

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
            <DialogTitle className="sr-only">Issue Details</DialogTitle>
            <Input
              value={editedIssue.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 flex-1"
              placeholder="Issue title..."
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Issue Overview Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Issue Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Assigned To */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    Assigned To
                  </Label>
                  <Select
                    value={editedIssue.assignedTo?.id || ''}
                    onValueChange={(value) => {
                      const member = teamMembers.find(m => m.id === value);
                      handleFieldChange('assignedTo', member);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee">
                        {editedIssue.assignedTo && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {editedIssue.assignedTo.initials}
                              </AvatarFallback>
                            </Avatar>
                            {editedIssue.assignedTo.name}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            {/* Blocking Items */}
            {((editedIssue.blocksTaskIds?.length || 0) > 0 || (editedIssue.blocksMilestoneIds?.length || 0) > 0) && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-destructive" />
                    Blocking Items
                  </h3>
                  <div className="space-y-2">
                    {editedIssue.blocksTaskIds?.map((taskId) => (
                      <Badge key={taskId} variant="outline" className="mr-2">
                        Task: {taskId}
                      </Badge>
                    ))}
                    {editedIssue.blocksMilestoneIds?.map((msId) => (
                      <Badge key={msId} variant="outline" className="mr-2 border-chart-4 text-chart-4">
                        Milestone: {msId}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            )}

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
            {editedIssue.tags && editedIssue.tags.length > 0 && (
              <>
                <Separator />
                <section className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {editedIssue.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            )}

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
