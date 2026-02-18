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
import { Trash2 } from 'lucide-react';

interface IssueDetailModalProps {
  issue: Issue | null;
  tasks?: Task[];
  teamMembers?: TeamMember[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (issue: Issue) => void;
  onDelete?: (issueId: string) => void;
  mode?: 'view' | 'create';
  onCreate?: (issue: Issue) => void;
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
  mode = 'view',
  onCreate,
}: IssueDetailModalProps) {
  const navigate = useNavigate();

  if (!issue) return null;

  const handleDelete = () => {
    if (onDelete && issue && window.confirm('Are you sure you want to delete this issue?')) {
      onDelete(issue.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header - shown for create mode */}
        {mode === 'create' && (
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Create New Issue</DialogTitle>
          </DialogHeader>
        )}
        {/* Accessible title for view mode (screen readers only) */}
        {mode !== 'create' && (
          <DialogTitle className="sr-only">Issue Details</DialogTitle>
        )}
        <DialogDescription className="sr-only">
          View and edit details for issue {issue?.title || 'New Issue'}
        </DialogDescription>
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6">
            <IssueDetailContent
              issue={issue}
              tasks={tasks}
              teamMembers={teamMembers}
              onUpdate={onUpdate}
              onDelete={undefined}
              isDraft={mode === 'create'}
              onExpand={mode === 'create' ? undefined : () => {
                const pathParts = window.location.pathname.split('/');
                const projectIndex = pathParts.indexOf('projects');
                if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
                  const projectId = pathParts[projectIndex + 1];
                  navigate(`/projects/${projectId}/issues/${issue.id}`);
                } else {
                  console.warn("Could not determine project ID from URL");
                }
                onClose();
              }}
            />
          </div>
        </ScrollArea>

        {mode === 'create' && (
          <div className="p-4 border-t flex justify-end gap-2 bg-background z-10">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onCreate?.(issue!)}>Create Issue</Button>
          </div>
        )}

        {mode === 'view' && (
          <div className="p-4 border-t flex items-center justify-between bg-background z-10">
            {/* Delete button on the bottom left */}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Issue
              </Button>
            )}
            {!onDelete && <div />}
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
