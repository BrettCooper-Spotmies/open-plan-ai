import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Issue, IssueStatus, IssueSeverity, IssueCategory, Task, TeamMember } from '@/types';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorSwatchPicker } from '@/components/shared/ColorSwatchPicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { playCompleteSound } from '@/lib/playSound';
import { resolveFileUrl } from '@/utils/fileUrl';
import {
  AlertTriangle,
  Info,
  Bug,
  Truck,
  FileWarning,
  FlaskConical,
  Pencil,
  Link2,
  GripVertical,
  Plus,
  Check,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IssueDetailModal } from './IssueDetailModal';
import { ISSUE_SEVERITY_DISPLAY } from './issueSeverity';
import { useIssueColumns, useCreateIssueColumn, useDeleteIssueColumn, useReorderIssueColumns } from '@/hooks/useIssueColumns';
import { useUpdateIssueStatus } from '@/hooks/useProjectMutations';
import { DEFAULT_ISSUE_COLUMNS } from '@/services/issueColumns.service';
import { useAuth } from '@/modules/auth';

interface IssuesViewProps {
  issues: Issue[];
  viewMode?: 'table' | 'kanban';
  tasks?: Task[];
  teamMembers?: TeamMember[];
  searchQuery?: string;
  severityFilter?: IssueSeverity[];
  statusFilter?: IssueStatus[];
  assigneeFilter?: string[];
  assignedByFilter?: string[];
  dueDateFilter?: 'overdue' | 'today' | 'this-week' | 'this-month' | 'no-date';
  reportedDateFilter?: 'today' | 'this-week' | 'this-month';
  isAddDialogOpen?: boolean;
  onAddDialogClose?: () => void;
  onIssueUpdate?: (issue: Issue) => void;
  onIssueCreate?: (issue: Partial<Issue>, pendingFiles?: File[]) => void;
  onIssueDelete?: (issueId: string) => void;
}

interface IssuesKanbanColumn {
  id: string;
  status: string;
  label: string;
  color: string;
  isSpecial?: boolean;
}

const STATUS_BADGE_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Open' },
  'in-progress': { color: 'bg-orange-500/20 text-orange-600 border-orange-500/30', label: 'In Progress' },
  resolved: { color: 'bg-status-done/20 text-status-done border-status-done/30', label: 'Resolved' },
  closed: { color: 'bg-muted text-muted-foreground border-muted', label: 'Closed' },
  'wont-fix': { color: 'bg-muted text-muted-foreground border-muted line-through', label: "Won't Fix" },
};

function getStatusBadge(status: string) {
  return STATUS_BADGE_CONFIG[status] ?? { color: 'bg-primary/20 text-primary border-primary/30', label: status };
}

const categoryConfig: Record<IssueCategory, { icon: typeof Bug; label: string }> = {
  defect: { icon: Bug, label: 'Defect' },
  risk: { icon: AlertTriangle, label: 'Risk' },
  supplier: { icon: Truck, label: 'Supplier' },
  compliance: { icon: FileWarning, label: 'Compliance' },
  'test-failure': { icon: FlaskConical, label: 'Test Failure' },
  'design-change': { icon: Pencil, label: 'Design Change' },
  other: { icon: Info, label: 'Other' },
};

const DEPENDENCIES_COLUMN: IssuesKanbanColumn = {
  id: 'col-dependencies',
  status: 'dependencies',
  label: 'Dependencies',
  color: '#f59e0b',
  isSpecial: true,
};

function apiColumnsToKanban(apiCols: typeof DEFAULT_ISSUE_COLUMNS): IssuesKanbanColumn[] {
  return [
    DEPENDENCIES_COLUMN,
    ...apiCols.map((c) => ({
      id: c.id,
      status: c.status,
      label: c.label,
      color: c.color,
      isSpecial: c.isSpecial ?? false,
    })),
  ];
}

const issueSeverityBorder: Record<IssueSeverity, string> = {
  critical: 'border-l-destructive',
  major: 'border-l-orange-500',
  minor: 'border-l-yellow-500',
  trivial: 'border-l-muted-foreground',
};

const BOARD_CHECKLIST_PREVIEW_COUNT = 2;

export function IssuesView({
  issues,
  viewMode = 'table',
  tasks = [],
  teamMembers = [],
  searchQuery: externalSearchQuery,
  severityFilter: externalSeverityFilter = [],
  statusFilter: externalStatusFilter = [],
  assigneeFilter: externalAssigneeFilter = [],
  assignedByFilter: externalAssignedByFilter = [],
  dueDateFilter: externalDueDateFilter,
  reportedDateFilter: externalReportedDateFilter,
  isAddDialogOpen: externalIsAddDialogOpen,
  onAddDialogClose,
  onIssueUpdate,
  onIssueCreate,
  onIssueDelete,
}: IssuesViewProps) {
  const { id: routeProjectId } = useParams();
  const { user } = useAuth();
  const { data: apiIssueColumns } = useIssueColumns(routeProjectId);
  const createIssueColumn = useCreateIssueColumn(routeProjectId);
  const deleteIssueColumn = useDeleteIssueColumn(routeProjectId);
  const reorderIssueColumns = useReorderIssueColumns(routeProjectId);
  const updateIssueStatus = useUpdateIssueStatus(routeProjectId || '');

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSeverityFilter, setInternalSeverityFilter] = useState<IssueSeverity[]>([]);
  const [internalStatusFilter, setInternalStatusFilter] = useState<IssueStatus[]>([]);
  const [localIssues, setLocalIssues] = useState<Issue[]>(issues);
  const [columns, setColumns] = useState<IssuesKanbanColumn[]>(() =>
    apiColumnsToKanban(DEFAULT_ISSUE_COLUMNS),
  );
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create'>('view');
  const [newIssueDraft, setNewIssueDraft] = useState<Issue | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [expandedChecklistPreview, setExpandedChecklistPreview] = useState<Record<string, boolean>>({});

  // Sync columns from API
  useEffect(() => {
    if (apiIssueColumns && apiIssueColumns.length > 0) {
      setColumns(apiColumnsToKanban(apiIssueColumns));
    }
  }, [apiIssueColumns]);

  // Use external props if provided
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const severityFilter = externalSeverityFilter ?? internalSeverityFilter;
  const statusFilter = externalStatusFilter ?? internalStatusFilter;
  const assigneeFilter = externalAssigneeFilter;
  const assignedByFilter = externalAssignedByFilter;
  const dueDateFilter = externalDueDateFilter;
  const reportedDateFilter = externalReportedDateFilter;

  useEffect(() => {
    setLocalIssues(issues);
  }, [issues]);

  const handleAddColumn = () => {
    if (!newColumnName.trim() || !routeProjectId) return;
    createIssueColumn.mutate(
      { label: newColumnName, color: newColumnColor },
      {
        onSuccess: () => {
          setNewColumnName('');
          setNewColumnColor('#3b82f6');
          setIsAddColumnOpen(false);
        },
      },
    );
  };

  const handleRemoveColumn = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (column?.isSpecial) return;
    deleteIssueColumn.mutate(columnId);
  };


  const filteredIssues = localIssues.filter(issue => {
    const matchesSearch = (issue.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = !severityFilter.length || severityFilter.includes(issue.severity);
    const matchesStatus = !statusFilter.length || statusFilter.includes(issue.status);
    const matchesAssignee = !assigneeFilter.length ||
      (assigneeFilter.includes('unassigned') && (!issue.assignees || issue.assignees.length === 0)) ||
      (issue.assignees?.some(a => assigneeFilter.includes(a.id)));
    const matchesAssignedBy = !assignedByFilter.length ||
      assignedByFilter.includes(issue.reportedBy.id);
    let matchesDueDate = true;
    if (dueDateFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const issueDueDate = issue.dueDate ? new Date(issue.dueDate) : null;
      switch (dueDateFilter) {
        case 'overdue':
          matchesDueDate = !!issueDueDate && issueDueDate < today;
          break;
        case 'today':
          matchesDueDate = !!issueDueDate && issueDueDate.toDateString() === today.toDateString();
          break;
        case 'this-week': {
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() + 7);
          matchesDueDate = !!issueDueDate && issueDueDate >= today && issueDueDate <= weekEnd;
          break;
        }
        case 'this-month': {
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          matchesDueDate = !!issueDueDate && issueDueDate >= today && issueDueDate <= monthEnd;
          break;
        }
        case 'no-date':
          matchesDueDate = !issueDueDate;
          break;
      }
    }
    let matchesReportedDate = true;
    if (reportedDateFilter) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const issueReportedDate = issue.reportedAt ? new Date(issue.reportedAt) : null;
      switch (reportedDateFilter) {
        case 'today':
          matchesReportedDate = !!issueReportedDate && issueReportedDate.toDateString() === todayStart.toDateString();
          break;
        case 'this-week': {
          const weekStart = new Date(todayStart);
          weekStart.setDate(todayStart.getDate() - 7);
          matchesReportedDate = !!issueReportedDate && issueReportedDate >= weekStart && issueReportedDate <= todayEnd;
          break;
        }
        case 'this-month': {
          const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
          matchesReportedDate = !!issueReportedDate && issueReportedDate >= monthStart && issueReportedDate <= todayEnd;
          break;
        }
      }
    }

    return matchesSearch && matchesSeverity && matchesStatus && matchesAssignee && matchesAssignedBy && matchesDueDate && matchesReportedDate;
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
      reportedBy: { id: user?.id ?? 'currentUser', name: user?.name ?? 'Current User', initials: user?.initials ?? user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'CU', avatar: user?.avatarUrl ?? '', email: user?.email ?? '', role: 'Member' },
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

    if (status === 'resolved') {
      playCompleteSound();
    }

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
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const persistableIds = newColumns.filter(col => UUID_RE.test(col.id)).map(col => col.id);
      if (persistableIds.length > 0) reorderIssueColumns.mutate(persistableIds);
      return;
    }

    const destinationColumn = columns.find((col) => col.id === destination.droppableId);
    if (!destinationColumn) return;

    if (destinationColumn.isSpecial && destinationColumn.status === 'dependencies') {
      return;
    }

    const movedIssue = localIssues.find(issue => issue.id === draggableId);
    if (!movedIssue) return;

    const newStatus = destinationColumn.status;
    if (movedIssue.status === newStatus) return;

    setLocalIssues(prev => prev.map(i => i.id === movedIssue.id ? { ...i, status: newStatus as IssueStatus } : i));
    updateIssueStatus.mutate({ issueId: movedIssue.id, status: newStatus });
  };

  const getColumnIssues = (column: IssuesKanbanColumn) => {
    if (column.isSpecial && column.status === 'dependencies') {
      return sortedIssues.filter(isDependencyIssue);
    }
    return sortedIssues.filter(issue => issue.status === column.status && !isDependencyIssue(issue));
  };

  const handleToggleChecklistItemOnCard = (issueId: string, checklistItemId: string) => {
    const issue = localIssues.find((i) => i.id === issueId);
    if (!issue) return;
    const updatedChecklist = (issue.checklist || []).map((item) =>
      item.id === checklistItemId ? { ...item, completed: !item.completed } : item
    );
    const updatedIssue = { ...issue, checklist: updatedChecklist };
    setLocalIssues(localIssues.map((i) => (i.id === issueId ? updatedIssue : i)));
    onIssueUpdate?.(updatedIssue);
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
                        isDragDisabled={column.isSpecial || !apiIssueColumns?.length}
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
                                {!column.isSpecial && !isDependenciesColumn && (
                                  <div className="ml-auto">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive gap-2"
                                          onClick={() => handleRemoveColumn(column.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete Bucket
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
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
                                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleStatusChange(issue, issue.status === 'resolved' ? 'open' : 'resolved');
                                                        }}
                                                        className={cn(
                                                          'shrink-0 mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center transition-all',
                                                          issue.status === 'resolved'
                                                            ? 'bg-status-done/20 border-status-done'
                                                            : 'border-foreground/30 hover:border-foreground hover:bg-muted bg-background'
                                                        )}
                                                        aria-label="Mark as resolved"
                                                      >
                                                        {issue.status === 'resolved' && <Check className="h-2.5 w-2.5 text-status-done" />}
                                                      </button>
                                                      <p className="text-sm font-medium line-clamp-2">{issue.title}</p>
                                                    </div>
                                                    <div className="text-muted-foreground hover:text-foreground mt-0.5">
                                                      <GripVertical className="h-4 w-4" />
                                                    </div>
                                                  </div>

                                                  {issue.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
                                                  )}

                                                  {(() => {
                                                    const boardChecklistItems = (issue.checklist || []).filter(
                                                      (item) => item.showInBoardView === true
                                                    );
                                                    if (boardChecklistItems.length === 0) return null;
                                                    const isExpanded = expandedChecklistPreview[issue.id] === true;
                                                    const visibleItems = isExpanded
                                                      ? boardChecklistItems
                                                      : boardChecklistItems.slice(0, BOARD_CHECKLIST_PREVIEW_COUNT);
                                                    const hasMore = boardChecklistItems.length > BOARD_CHECKLIST_PREVIEW_COUNT;
                                                    return (
                                                      <div className="space-y-1.5 pt-1">
                                                        {visibleItems.map((item) => (
                                                          <div key={item.id} className="flex items-center gap-2">
                                                            <Checkbox
                                                              checked={item.completed}
                                                              onCheckedChange={(checked) => {
                                                                if (checked === 'indeterminate') return;
                                                                handleToggleChecklistItemOnCard(issue.id, item.id);
                                                              }}
                                                              className="h-3.5 w-3.5 rounded-[3px]"
                                                              onClick={(event) => event.stopPropagation()}
                                                            />
                                                            <button
                                                              type="button"
                                                              onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleToggleChecklistItemOnCard(issue.id, item.id);
                                                              }}
                                                              className={cn(
                                                                'min-w-0 flex-1 text-left text-[11px] text-muted-foreground truncate',
                                                                item.completed && 'line-through'
                                                              )}
                                                            >
                                                              {item.text}
                                                            </button>
                                                          </div>
                                                        ))}
                                                        {hasMore && (
                                                          <button
                                                            type="button"
                                                            className="text-[11px] text-primary hover:underline"
                                                            onClick={(event) => {
                                                              event.stopPropagation();
                                                              setExpandedChecklistPreview((prev) => ({
                                                                ...prev,
                                                                [issue.id]: !isExpanded,
                                                              }));
                                                            }}
                                                          >
                                                            {isExpanded ? 'View less' : `View more (${boardChecklistItems.length - BOARD_CHECKLIST_PREVIEW_COUNT})`}
                                                          </button>
                                                        )}
                                                      </div>
                                                    );
                                                  })()}

                                                  {/* <div className="flex items-center justify-between gap-2">
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
                                                      <Badge variant="outline" className={cn(getStatusBadge(issue.status).color)}>
                                                        {getStatusBadge(issue.status).label}
                                                      </Badge>
                                                    )}
                                                  </div> */}

                                                  <div className="flex items-center justify-between pt-1">
                                                    <div className="flex -space-x-2">
                                                      {(issue.assignees || []).slice(0, 3).map((assignee) => (
                                                        <Avatar key={assignee.id} className="h-5 w-5 border-2 border-background">
                                                          <AvatarImage src={resolveFileUrl(assignee.avatar) ?? assignee.avatar} alt={assignee.name} />
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

                  {/* Add Bucket */}
                  <div className="w-[280px] flex-shrink-0">
                    <div className="sticky top-0 bg-background z-10 pb-3 space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        <h3 className="font-medium text-sm text-muted-foreground">Add Bucket</h3>
                      </div>
                      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
                        <DialogTrigger asChild>
                          <div className="px-2">
                            <Button
                              variant="ghost"
                              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add New Bucket
                            </Button>
                          </div>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Bucket</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>Bucket Name</Label>
                              <Input
                                placeholder="e.g., In Review"
                                value={newColumnName}
                                maxLength={30}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Color</Label>
                              <ColorSwatchPicker
                                value={newColumnColor}
                                onChange={setNewColumnColor}
                              />
                            </div>
                            <Button
                              onClick={handleAddColumn}
                              disabled={!newColumnName.trim() || createIssueColumn.isPending}
                              className="w-full"
                            >
                              Add Bucket
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
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
                        <Badge variant="outline" className={cn(getStatusBadge(issue.status).color)}>
                          {getStatusBadge(issue.status).label}
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
                                <AvatarImage src={resolveFileUrl(assignee.avatar) ?? assignee.avatar} alt={assignee.name} />
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
