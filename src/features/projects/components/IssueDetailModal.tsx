import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Issue,
  Task,
  IssueSeverity,
  TeamMember,
} from '@/types';
import { IssueDetailContent } from './IssueDetailContent';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Trash2, Maximize2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { logger } from '@/services/monitoring/logger';
import { useAuth } from '@/contexts/AuthContext';

interface IssueDetailModalProps {
  issue: Issue | null;
  tasks?: Task[];
  teamMembers?: TeamMember[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (issue: Issue) => void;
  onDelete?: (issueId: string) => void;
  userProjectRole?: string;
  mode?: 'view' | 'create';
  onCreate?: (issue: Issue, pendingFiles?: File[]) => void;
}

const severityOptions: { value: IssueSeverity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-destructive text-destructive-foreground' },
  { value: 'major', label: 'Major', color: 'bg-orange-500 text-white' },
  { value: 'minor', label: 'Minor', color: 'bg-yellow-500 text-black' },
  { value: 'trivial', label: 'Trivial', color: 'bg-muted text-muted-foreground' },
];

export function IssueDetailModal({
  issue,
  tasks = [],
  teamMembers = [],
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  userProjectRole,
  mode = 'view',
  onCreate,
}: IssueDetailModalProps) {
  const navigate = useNavigate();
  const { user: profile } = useAuth();
  const [editedIssue, setEditedIssue] = useState<Issue | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen && issue) {
      setEditedIssue(issue);
    }
  }, [isOpen, issue?.id]);

  if (!editedIssue) return null;

  const handleDelete = () => {
    if (onDelete && editedIssue) {
      onDelete(editedIssue.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleUpdateIssue = () => {
    if (editedIssue) {
      onUpdate(editedIssue);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header - create mode */}
        {mode === 'create' && (
          <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between">
            <DialogTitle>Create New Issue</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
        )}
        {/* Header - view mode with expand + close */}
        {mode !== 'create' && (
          <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-medium text-muted-foreground">Issue</DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const pathParts = window.location.pathname.split('/');
                  const projectIndex = pathParts.indexOf('projects');
                  if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
                    navigate(`/projects/${pathParts[projectIndex + 1]}/issues/${editedIssue.id}`);
                  } else {
                    logger.warn('Could not determine project ID from URL');
                  }
                  onClose();
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        )}
        <DialogDescription className="sr-only">
          View and edit details for issue {editedIssue?.title || 'New Issue'}
        </DialogDescription>
        <ScrollArea className="flex-1 overflow-y-auto w-full">
          <div className="p-6">
            <IssueDetailContent
              issue={editedIssue}
              tasks={tasks}
              teamMembers={teamMembers}
              onUpdate={setEditedIssue}
              onDelete={undefined}
              isDraft={true} // Always pretend it's draft to enable auto-callbacks to onUpdate instead of parent
              mode={mode}
              onPendingFilesChange={setPendingFiles}
              onExpand={undefined}
            />
          </div>
        </ScrollArea>

        {mode === 'create' && (
          <div className="p-4 border-t flex justify-end gap-2 bg-background z-10 w-full">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => onCreate?.(editedIssue!, pendingFiles)}
              disabled={!editedIssue.title.trim()}
            >
              Create Issue
            </Button>
          </div>
        )}

        {mode === 'view' && (
          <div className="p-4 border-t flex justify-end gap-2 bg-background z-10 w-full">
            <div className="flex-1">
              {/* Delete button — only for issue creator or project admin */}
              {onDelete && (userProjectRole === 'admin' || editedIssue?.reportedBy?.id === profile?.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Issue
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleUpdateIssue}
              disabled={!editedIssue.title.trim()}
            >
              Update Issue
            </Button>
          </div>
        )}
      </DialogContent>
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Issue"
        description="Are you sure you want to delete this issue? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </Dialog>
  );
}
