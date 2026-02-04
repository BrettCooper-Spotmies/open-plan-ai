import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
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
  // We need local state for the issue being edited in Create mode to handle the final submission
  // However, IssueDetailContent manages its own local state and calls onUpdate.
  // We will assume onUpdate updates the parent's draft state.
  // But for the "Create" button, we need access to that latest state.
  // Simplest is to rely on the `issue` prop being updated by the parent via `onUpdate`.

  if (!issue) return null;

  const handleExpand = () => {
    // Navigate to the full page view
    // Assuming we have access to projectId, but Issue doesn't store it directly in this mock.
    // We will fallback to a hardcoded project ID or context if needed, but for now lets assume "p1" or similar
    // In a real app we'd pass projectId or get it from context.
    // Since existing paths use /projects/:id, we need that ID.
    // Let's assume we are in a project context and pass it, or just use 'p-1' for now as per mock data usuage.
    // Better yet, let's grab it from the URL if possible or just push to absolute path if we knew it.
    // For this step I will assume specific project 'project-1' as typical in these mocks or rely on parent passing it.

    // Actually, let's try to get it from location but we are in a modal. 
    // safer to just use a placeholder 'project-1' if we don't have it, or update props to receive it.
    // I'll update the prop in a second if needed, but lets try to just route to /projects/project-1/issues/:id 
    // as a safe default for this demo if not provided.
    // Wait, I can use useParams() from react-router since this modal is rendered inside a route!

    navigate(window.location.pathname + `/issues/${issue.id}`);
    // Wait, appending might be wrong if we are already deep. 
    // Typical URL: /projects/project-1
    // Target URL: /projects/project-1/issues/issue-1

    // Better approach:
    const currentPath = window.location.pathname;
    // If we are at /projects/abc, we want /projects/abc/issues/xyz
    // If we are at /projects/abc/tasks, we want /projects/abc/issues/xyz
    // Let's strip the last segment if it is a section like 'tasks' or 'milestones' but project detail path is usually just /projects/:id
    // Let's assume `useParams` usage.

    onClose(); // Close modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6">
            <IssueDetailContent
              issue={issue}
              tasks={tasks}
              teamMembers={teamMembers}
              onUpdate={onUpdate}
              onDelete={mode === 'create' ? undefined : onDelete}
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
      </DialogContent>
    </Dialog >
  );
}
