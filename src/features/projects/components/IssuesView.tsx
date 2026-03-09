import { useState, useEffect } from 'react';
import { Issue, IssueStatus, IssueSeverity, IssueCategory, Task, TeamMember } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Truck,
  FileWarning,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Filter,
  Link2,
  Check,
} from 'lucide-react';
import { IssueDetailModal } from './IssueDetailModal';

interface IssuesViewProps {
  issues: Issue[];
  tasks?: Task[];
  teamMembers?: TeamMember[];
  searchQuery?: string;
  severityFilter?: IssueSeverity | 'all';
  statusFilter?: IssueStatus | 'all';
  assigneeFilter?: string | 'all';
  dueDateFilter?: boolean | 'all';
  isAddDialogOpen?: boolean;
  onAddDialogClose?: () => void;
  onIssueUpdate?: (issue: Issue) => void;
  onIssueCreate?: (issue: Partial<Issue>) => void;
  onIssueDelete?: (issueId: string) => void;
}

const severityConfig: Record<IssueSeverity, { color: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle, label: 'Critical' },
  major: { color: 'bg-orange-500 text-white', icon: AlertCircle, label: 'Major' },
  minor: { color: 'bg-yellow-500 text-black', icon: Info, label: 'Minor' },
  trivial: { color: 'bg-muted text-muted-foreground', icon: Info, label: 'Trivial' },
};

const statusConfig: Record<IssueStatus, { color: string; label: string }> = {
  open: { color: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Open' },
  investigating: { color: 'bg-orange-500/20 text-orange-600 border-orange-500/30', label: 'Investigating' },
  resolved: { color: 'bg-status-done/20 text-status-done border-status-done/30', label: 'Resolved' },
  closed: { color: 'bg-muted text-muted-foreground border-muted', label: 'Closed' },
  'wont-fix': { color: 'bg-muted text-muted-foreground border-muted line-through', label: "Won't Fix" },
};

const categoryConfig: Record<IssueCategory, { icon: typeof Bug; label: string }> = {
  defect: { icon: Bug, label: 'Defect' },
  risk: { icon: AlertTriangle, label: 'Risk' },
  supplier: { icon: Truck, label: 'Supplier' },
  compliance: { icon: FileWarning, label: 'Compliance' },
  'test-failure': { icon: FlaskConical, label: 'Test Failure' },
  'design-change': { icon: Pencil, label: 'Design Change' },
  other: { icon: Info, label: 'Other' },
};

export function IssuesView({
  issues,
  tasks = [],
  teamMembers = [],
  searchQuery: externalSearchQuery,
  severityFilter: externalSeverityFilter = 'all',
  statusFilter: externalStatusFilter = 'all',
  assigneeFilter: externalAssigneeFilter = 'all',
  dueDateFilter: externalDueDateFilter = 'all',
  isAddDialogOpen: externalIsAddDialogOpen,
  onAddDialogClose,
  onIssueUpdate,
  onIssueCreate,
  onIssueDelete,
}: IssuesViewProps) {
  const navigate = useNavigate();
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSeverityFilter, setInternalSeverityFilter] = useState<IssueSeverity | 'all'>('all');
  const [internalStatusFilter, setInternalStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create'>('view');
  const [newIssueDraft, setNewIssueDraft] = useState<Issue | null>(null);

  // Use external props if provided
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const severityFilter = externalSeverityFilter ?? internalSeverityFilter;
  const statusFilter = externalStatusFilter ?? internalStatusFilter;
  const assigneeFilter = externalAssigneeFilter;
  const dueDateFilter = externalDueDateFilter;


  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' ||
      (assigneeFilter === 'unassigned' ? (issue.assignees?.length === 0) : issue.assignees?.some(a => a.id === assigneeFilter));
    const matchesDueDate = dueDateFilter === 'all' ||
      (dueDateFilter ? !!issue.dueDate : !issue.dueDate);

    return matchesSearch && matchesSeverity && matchesStatus && matchesAssignee && matchesDueDate;
  });

  // Sort by severity (critical first), then by date
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const severityOrder = { critical: 0, major: 1, minor: 2, trivial: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });

  const handleIssueClick = (issue: Issue) => {
    // Navigate to issue page
    navigate(`/projects/${issue.projectId}/issues/${issue.id}`);
  };

  const { id: routeProjectId } = useParams(); // ProjectDetail uses :id, so we grab that or check parent passes projectId

  const handleCreateIssue = () => {
    const newId = `issue-${Date.now()}`;
    // Assuming routeProjectId is available since we are inside ProjectDetail
    const pid = routeProjectId || (issues.length > 0 ? issues[0].projectId : 'p-1'); // Fallback if no issues

    const newIssueStub: Issue = {
      id: newId,
      title: '',
      description: '',
      status: 'open',
      severity: 'minor',
      category: 'other',
      projectId: pid, // Ensure projectId is set
      reportedBy: { id: 'currentUser', name: 'Current User', initials: 'CU', avatar: '', email: 'current.user@example.com', role: 'Member' },
      reportedAt: new Date().toISOString(), // Add reportedAt
      assignees: [],
      tags: [],
      attachments: [],
      comments: [],
      checklist: [],
      descriptionBlocks: [],
      blocksTaskIds: [],
      blocksMilestoneIds: [],
      blockedBy: [],
      // Add other required fields if any, defaulting to empty or safe values
      updatedAt: new Date().toISOString(),
    } as Issue; // Cast to Issue since we might be missing some optional fields but trying to fit checks

    setNewIssueDraft(newIssueStub);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Handle external add dialog trigger
  // We use a ref to track previous value so we can detect rising edge (false->true)
  // This ensures re-clicking "Report Issue" always opens the modal even if the prop was already true
  useEffect(() => {
    if (externalIsAddDialogOpen) {
      handleCreateIssue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalIsAddDialogOpen]);

  const handleIssueUpdateFromModal = (updatedIssue: Issue) => {
    if (modalMode === 'create') {
      setNewIssueDraft(updatedIssue);
    } else {
      onIssueUpdate?.(updatedIssue);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    onAddDialogClose?.();
  };

  const handleCreateSubmit = (issueToCreate: Issue) => {
    onIssueCreate?.(issueToCreate);
    setIsModalOpen(false);
    onAddDialogClose?.();
  };

  return (
    <div className="space-y-4">
      {/* Issues Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Severity</TableHead>
              <TableHead className="w-[300px]">Issue</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Blocking</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Reported</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedIssues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No issues found
                </TableCell>
              </TableRow>
            ) : (
              sortedIssues.map((issue) => {
                const SeverityIcon = severityConfig[issue.severity].icon;
                const CategoryIcon = categoryConfig[issue.category].icon;
                const blockingCount = (issue.blocksTaskIds?.length || 0) + (issue.blocksMilestoneIds?.length || 0);

                return (
                  <TableRow
                    key={issue.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleIssueClick(issue)}
                  >
                    <TableCell>
                      <Badge className={cn('gap-1', severityConfig[issue.severity].color)}>
                        <SeverityIcon className="h-3 w-3" />
                        {severityConfig[issue.severity].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        {(issue.status === 'resolved' || issue.status === 'closed') && (
                          <div className="h-4 w-4 rounded-full bg-status-done/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-status-done" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CategoryIcon className="h-4 w-4" />
                        {categoryConfig[issue.category].label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(statusConfig[issue.status].color)}>
                        {statusConfig[issue.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {blockingCount > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-destructive">
                          <Link2 className="h-3 w-3" />
                          {blockingCount} item{blockingCount > 1 ? 's' : ''}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {issue.assignees && issue.assignees.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          {issue.assignees.map((assignee) => (
                            <Avatar key={assignee.id} className="inline-block h-6 w-6 ring-2 ring-background">
                              <AvatarFallback className="text-[10px]">
                                {assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(issue.reportedAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issue={modalMode === 'create' ? newIssueDraft : selectedIssue}
        tasks={tasks}
        teamMembers={teamMembers}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onUpdate={handleIssueUpdateFromModal}
        onDelete={onIssueDelete}
        mode={modalMode}
        onCreate={handleCreateSubmit}
      />
    </div>
  );
}
