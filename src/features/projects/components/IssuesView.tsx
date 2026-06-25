import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Issue, IssueStatus, IssueSeverity, IssueCategory, Task, TeamMember } from '@/types';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Info,
  Bug,
  Truck,
  FileWarning,
  FlaskConical,
  Pencil,
  Link2,
  Check,
  GripVertical,
} from 'lucide-react';
import { IssueDetailModal } from './IssueDetailModal';
import { ISSUE_SEVERITY_DISPLAY } from './issueSeverity';

interface IssuesViewProps {
  issues: Issue[];
  viewMode?: 'table' | 'kanban';
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
  onIssueCreate?: (issue: Partial<Issue>, pendingFiles?: File[]) => void;
  onIssueDelete?: (issueId: string) => void;
}

interface IssuesKanbanColumn {
  id: string;
  status: IssueStatus | 'dependencies';
  label: string;
  color: string;
  isSpecial?: boolean;
}

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

const defaultIssueColumns: IssuesKanbanColumn[] = [
  { id: 'col-dependencies', status: 'dependencies', label: 'Dependencies', color: 'bg-status-blocked', isSpecial: true },
  { id: 'col-open', status: 'open', label: 'Open', color: 'bg-destructive' },
  { id: 'col-investigating', status: 'investigating', label: 'Investigating', color: 'bg-orange-500' },
  { id: 'col-resolved', status: 'resolved', label: 'Resolved', color: 'bg-status-done' },
  { id: 'col-closed', status: 'closed', label: 'Closed', color: 'bg-muted-foreground' },
  { id: 'col-wont-fix', status: 'wont-fix', label: "Won't Fix", color: 'bg-muted-foreground' },
];

const issueSeverityBorder: Record<IssueSeverity, string> = {
  critical: 'border-l-destructive',
  major: 'border-l-orange-500',
  minor: 'border-l-yellow-500',
  trivial: 'border-l-muted-foreground',
};

export function IssuesView({
  issues,
  viewMode = 'table',
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
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSeverityFilter, setInternalSeverityFilter] = useState<IssueSeverity | 'all'>('all');
  const [internalStatusFilter, setInternalStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [localIssues, setLocalIssues] = useState<Issue[]>(issues);
  const [columns, setColumns] = useState<IssuesKanbanColumn[]>(defaultIssueColumns);
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

  useEffect(() => {
    setLocalIssues(issues);
  }, [issues]);


  const filteredIssues = localIssues.filter(issue => {
    const matchesSearch = (issue.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.description || '').toLowerCase().includes(searchQuery.toLowerCase());
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
    setSelectedIssue(issue);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const { id: routeProjectId } = useParams(); // ProjectDetail uses :id, so we grab that or check parent passes projectId

  const handleCreateIssue = (initialStatus: IssueStatus = 'open') => {
    const newId = `issue-${Date.now()}`;
    // Assuming routeProjectId is available since we are inside ProjectDetail
    const pid = routeProjectId || (issues.length > 0 ? issues[0].projectId : 'p-1'); // Fallback if no issues

    const newIssueStub: Issue = {
      id: newId,
      title: '',
      description: '',
      status: initialStatus,
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

  const handleCreateSubmit = (issueToCreate: Issue, pendingFiles?: File[]) => {
    onIssueCreate?.(issueToCreate, pendingFiles);
    setIsModalOpen(false);
    onAddDialogClose?.();
  };

  const handleStatusChange = (issue: Issue, status: IssueStatus) => {
    if (issue.status === status) return;
    const updatedIssue = {
      ...issue,
      status,
      updatedAt: new Date().toISOString(),
    };

    setLocalIssues(prev => prev.map(i => (i.id === issue.id ? updatedIssue : i)));
    onIssueUpdate?.(updatedIssue);
  };

  const isDependencyIssue = (issue: Issue) => {
    const blockingCount = (issue.blocksTaskIds?.length || 0) + (issue.blocksMilestoneIds?.length || 0);
    return (blockingCount > 0 || (issue.blockedBy?.length || 0) > 0)
      && issue.status !== 'resolved'
      && issue.status !== 'closed'
      && issue.status !== 'wont-fix';
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, type, draggableId } = result;
    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (type === 'COLUMN') {
      const newColumns = Array.from(columns);
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);
      setColumns(newColumns);
      return;
    }

    const destinationColumn = columns.find((col) => col.id === destination.droppableId);
    if (!destinationColumn) return;

    if (destinationColumn.isSpecial && destinationColumn.status === 'dependencies') {
      return;
    }

    const movedIssue = localIssues.find(issue => issue.id === draggableId);
    if (!movedIssue) return;

    const newStatus = destinationColumn.status as IssueStatus;
    handleStatusChange(movedIssue, newStatus);
  };

  const getColumnIssues = (column: IssuesKanbanColumn) => {
    if (column.isSpecial && column.status === 'dependencies') {
      return sortedIssues.filter(isDependencyIssue);
    }
    return sortedIssues.filter(issue => issue.status === column.status && !isDependencyIssue(issue));
  };

  return (
    <div className="space-y-4">
      {viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="COLUMN" direction="horizontal">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="w-full overflow-x-auto pb-4">
                <div className="inline-flex gap-4 min-w-full" style={{ width: 'max-content' }}>
                  {columns.map((column, index) => {
                    const columnIssues = getColumnIssues(column);
                    const isDependenciesColumn = column.isSpecial && column.status === 'dependencies';

                    return (
                      <Draggable
                        key={column.id}
                        draggableId={column.id}
                        index={index}
                        isDragDisabled={column.isSpecial}
                      >
                        {(columnProvided, columnSnapshot) => (
                          <div
                            ref={columnProvided.innerRef}
                            {...columnProvided.draggableProps}
                            className={cn(
                              'w-[280px] flex-shrink-0 flex flex-col transition-shadow max-h-[calc(100vh-220px)]',
                              columnSnapshot.isDragging && 'shadow-lg'
                            )}
                          >
                            <div className="flex-shrink-0 bg-background pb-3 space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                {!column.isSpecial && (
                                  <div {...columnProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                {column.isSpecial && <div {...columnProvided.dragHandleProps} />}
                                {isDependenciesColumn ? (
                                  <Link2 className="h-4 w-4 text-status-blocked" />
                                ) : (
                                  <div className={cn('w-2 h-2 rounded-full', column.color)} />
                                )}
                                <h3 className={cn('font-medium text-sm', isDependenciesColumn && 'text-status-blocked')}>
                                  {column.label}
                                </h3>
                                <span className="text-xs text-muted-foreground">{columnIssues.length}</span>
                              </div>

                              {!isDependenciesColumn && (
                                <div className="px-2">
                                  <Button
                                    variant="ghost"
                                    className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                                    onClick={() => handleCreateIssue(column.status as IssueStatus)}
                                  >
                                    + Add Issue
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0">
                              <Droppable
                                droppableId={column.id}
                                type="ISSUE"
                                isDropDisabled={isDependenciesColumn}
                              >
                                {(issuesProvided, snapshot) => (
                                  <div
                                    ref={issuesProvided.innerRef}
                                    {...issuesProvided.droppableProps}
                                    className={cn(
                                      'space-y-2 min-h-[120px] p-2 rounded-lg transition-colors',
                                      snapshot.isDraggingOver ? 'bg-muted/50' : 'bg-muted/30'
                                    )}
                                  >
                                    {columnIssues.length === 0 ? (
                                      <p className="text-xs text-muted-foreground p-1">
                                        {isDependenciesColumn ? 'No dependency-linked issues' : 'No issues'}
                                      </p>
                                    ) : (
                                      columnIssues.map((issue, issueIndex) => {
                                        const SeverityIcon = ISSUE_SEVERITY_DISPLAY[issue.severity].icon;
                                        const linkedCount = (issue.blocksTaskIds?.length || 0)
                                          + (issue.blocksMilestoneIds?.length || 0)
                                          + (issue.blockedBy?.length || 0);

                                        return (
                                          <Draggable key={issue.id} draggableId={issue.id} index={issueIndex}>
                                            {(issueProvided, issueSnapshot) => (
                                              <Card
                                                ref={issueProvided.innerRef}
                                                {...issueProvided.draggableProps}
                                                {...issueProvided.dragHandleProps}
                                                className={cn(
                                                  'p-3 cursor-grab active:cursor-grabbing border-l-4 relative group hover:shadow-md transition-shadow',
                                                  issueSeverityBorder[issue.severity],
                                                  issueSnapshot.isDragging && 'shadow-lg rotate-2'
                                                )}
                                                onClick={() => handleIssueClick(issue)}
                                              >
                                                <div className="space-y-2">
                                                  <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-medium line-clamp-2">{issue.title}</p>
                                                    <div className="text-muted-foreground hover:text-foreground mt-0.5">
                                                      <GripVertical className="h-4 w-4" />
                                                    </div>
                                                  </div>

                                                  {issue.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
                                                  )}

                                                  <div className="flex items-center justify-between gap-2">
                                                    <Badge className={cn('gap-1', ISSUE_SEVERITY_DISPLAY[issue.severity].color)}>
                                                      <SeverityIcon className="h-3 w-3" />
                                                      {ISSUE_SEVERITY_DISPLAY[issue.severity].label}
                                                    </Badge>
                                                    {linkedCount > 0 ? (
                                                      <span className="text-xs text-destructive flex items-center gap-1">
                                                        <Link2 className="h-3 w-3" />
                                                        {linkedCount}
                                                      </span>
                                                    ) : (
                                                      <Badge variant="outline" className={cn(statusConfig[issue.status].color)}>
                                                        {statusConfig[issue.status].label}
                                                      </Badge>
                                                    )}
                                                  </div>

                                                  <div className="flex items-center justify-between pt-1">
                                                    <div className="flex -space-x-2">
                                                      {(issue.assignees || []).slice(0, 3).map((assignee) => (
                                                        <Avatar key={assignee.id} className="h-5 w-5 border-2 border-background">
                                                          <AvatarFallback className="text-[9px] bg-muted">{assignee.initials}</AvatarFallback>
                                                        </Avatar>
                                                      ))}
                                                      {(issue.assignees || []).length > 3 && (
                                                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center border-2 border-background z-10">
                                                          <span className="text-[8px] text-muted-foreground font-medium">+{(issue.assignees || []).length - 3}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                    {issue.dueDate && (
                                                      <span className="text-[10px] text-muted-foreground">
                                                        {new Date(issue.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </Card>
                                            )}
                                          </Draggable>
                                        );
                                      })
                                    )}
                                    {issuesProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
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
                  const SeverityIcon = ISSUE_SEVERITY_DISPLAY[issue.severity].icon;
                  const CategoryIcon = categoryConfig[issue.category].icon;
                  const blockingCount = (issue.blocksTaskIds?.length || 0) + (issue.blocksMilestoneIds?.length || 0);

                  return (
                    <TableRow
                      key={issue.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleIssueClick(issue)}
                    >
                      <TableCell>
                        <Badge className={cn('gap-1', ISSUE_SEVERITY_DISPLAY[issue.severity].color)}>
                          <SeverityIcon className="h-3 w-3" />
                          {ISSUE_SEVERITY_DISPLAY[issue.severity].label}
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
      )}

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
