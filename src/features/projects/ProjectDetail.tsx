import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ListTodo, Boxes, Flag, AlertTriangle, Users, Calendar, Search, X, Plus, Filter, User, Clock, ChevronLeft, LayoutGrid, List, Loader2, MessageCircle, Trash2, Layers, Upload, Download, GitMerge, ChartGantt, ShieldAlert, ListChecks } from 'lucide-react';
import { BOMView } from './components/BOMView';
import RequirementsView from './components/RequirementsView';
import { ECOView } from './components/ECOView';
import { GateView } from './components/GateView';
import { RiskView } from './components/RiskView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { TasksSection, ViewControls } from './components/TasksSection';
import { ModulesSection, ModuleViewControls } from './components/ModulesSection';
import { MilestonesView } from './components/MilestonesView';
import { IssuesView } from './components/IssuesView';
import { ProjectDetailSkeleton } from './components/ProjectDetailSkeleton';
import { ProjectProgressPopover } from './components/ProjectProgressPopover';
import { AddModuleDialog } from './components/AddModuleDialog';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskFiltersDropdown } from './components/TaskFiltersDropdown';
import { useProjectDetail, useProjectModules } from '@/hooks/useProjectDetail';
import { useOrganizationMembers, useProjectMembers } from '@/hooks/useProjectTeam';
import { useProjectTaskColumns } from '@/hooks/useProjectTaskColumns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUpdateProject } from '@/hooks/useProjects';
import {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useBatchUpdateTasks,
  useBatchUpdateModules,
} from '@/hooks/useProjectMutations';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { projectMembersService } from '@/services/projectMembers.service';
import { attachmentsService } from '@/services/attachments.service';
import { chatService } from '@/services/chat.service';
import { toast } from 'sonner';
import { calculateProjectProgress } from './utils/projectUtils';
import { ProjectSection, Module, TaskViewMode, TaskFilter, ModuleViewMode, Issue, Milestone, Task, IssueStatus, IssueSeverity, TeamMember } from '@/types';
import { logger } from '@/services/monitoring/logger';

// Issue Filter interface
interface IssueFilter {
  status?: IssueStatus | 'all';
  severity?: IssueSeverity | 'all';
  assigneeId?: string | 'all';
  hasDueDate?: boolean | 'all';
}

const stageColors = {
  concept: 'bg-muted text-muted-foreground',
  design: 'bg-chart-1/10 text-chart-1',
  development: 'bg-chart-2/10 text-chart-2',
  testing: 'bg-chart-4/10 text-chart-4',
  production: 'bg-chart-3/10 text-chart-3',
};

const DEFAULT_MEMBER_REMOVAL_PROMPT: {
  open: boolean;
  memberId: string | null;
  memberName: string;
} = {
  open: false,
  memberId: null,
  memberName: '',
};

// Milestone View Controls Component
function MilestoneViewControls({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  onAddMilestone,
}: {
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onAddMilestone?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 w-full justify-between md:justify-end">
      <div className="flex items-center gap-2 flex-1 min-w-0 md:flex-none">
        <div className="relative flex items-center flex-1 md:flex-none min-w-0">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search milestones..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 w-full md:w-[200px] h-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchQueryChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center rounded-md border p-1">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => onViewModeChange('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {onAddMilestone && (
        <Button size="sm" className="gap-2 shrink-0 px-2 md:px-3" onClick={onAddMilestone}>
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Add Milestone</span>
        </Button>
      )}
    </div>
  );
}

// Issue View Controls Component
function IssueViewControls({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  filters,
  onFiltersChange,
  teamMembers,
  activeFilterCount,
  onClearFilters,
  onReportIssue,
}: {
  viewMode: 'table' | 'kanban';
  onViewModeChange: (mode: 'table' | 'kanban') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filters: IssueFilter;
  onFiltersChange: (filters: IssueFilter) => void;
  teamMembers: TeamMember[];
  activeFilterCount: number;
  onClearFilters: () => void;
  onReportIssue: () => void;
}) {
  return (
    <div className="flex items-center gap-2 w-full justify-between md:justify-end">
      <div className="flex items-center gap-2 flex-1 min-w-0 md:flex-none">
        {/* Search Input */}
        <div className="relative flex items-center flex-1 md:flex-none">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 w-full md:w-[200px] h-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchQueryChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center rounded-md border p-1">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => onViewModeChange('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => onViewModeChange('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 relative">
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filter Issues</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-6 px-2 text-xs">
                    Clear all
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Status
                </Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => onFiltersChange({ ...filters, status: v as IssueStatus | 'all' })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="wont-fix">Won't Fix</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Flag className="h-3 w-3" />
                  Severity
                </Label>
                <Select
                  value={filters.severity || 'all'}
                  onValueChange={(v) => onFiltersChange({ ...filters, severity: v as IssueSeverity | 'all' })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="trivial">Trivial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Assignee
                </Label>
                <Select
                  value={filters.assigneeId || 'all'}
                  onValueChange={(v) => onFiltersChange({ ...filters, assigneeId: v })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due Date
                </Label>
                <Select
                  value={filters.hasDueDate === undefined || filters.hasDueDate === 'all' ? 'all' : filters.hasDueDate ? 'has-due' : 'no-due'}
                  onValueChange={(v) => onFiltersChange({
                    ...filters,
                    hasDueDate: v === 'all' ? 'all' : v === 'has-due'
                  })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="has-due">Has Due Date</SelectItem>
                    <SelectItem value="no-due">No Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button size="sm" className="gap-2 shrink-0 px-2 md:px-3" onClick={onReportIssue}>
        <Plus className="h-4 w-4" />
        <span className="hidden md:inline">Report Issue</span>
      </Button>
    </div>
  );
}

export default function ProjectDetail() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: boardColumns } = useProjectTaskColumns(id);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab') as ProjectSection;

  const isMobile = useIsMobile();
  const [section, setSection] = useState<ProjectSection>(tabParam || 'bom');
  const [viewModeStr, setViewModeStr] = useState<TaskViewMode | null>(null);
  const [moduleViewModeStr, setModuleViewModeStr] = useState<ModuleViewMode | null>(null);
  const [issueViewModeStr, setIssueViewModeStr] = useState<'table' | 'kanban' | null>(null);
  const [bomAddOpen, setBomAddOpen] = useState(false);
  const [ecoNewOpen, setEcoNewOpen] = useState(false);
  const [milestoneViewModeStr, setMilestoneViewModeStr] = useState<'list' | 'kanban' | null>(null);

  const viewMode = viewModeStr || (isMobile ? 'list' : 'kanban');
  const moduleViewMode = moduleViewModeStr || (isMobile ? 'list' : 'kanban');
  const issueViewMode = issueViewModeStr || (isMobile ? 'table' : 'kanban');
  const milestoneViewMode = milestoneViewModeStr || (isMobile ? 'list' : 'kanban');

  const setViewMode = (val: TaskViewMode) => setViewModeStr(val);
  const setModuleViewMode = (val: ModuleViewMode) => setModuleViewModeStr(val);
  const setIssueViewMode = (val: 'table' | 'kanban') => setIssueViewModeStr(val);
  const setMilestoneViewMode = (val: 'list' | 'kanban') => setMilestoneViewModeStr(val);

  const [filters, setFilters] = useState<TaskFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [milestoneSearchQuery, setMilestoneSearchQuery] = useState('');
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  const [issueFilters, setIssueFilters] = useState<IssueFilter>({});
  const [isAddModuleDialogOpen, setIsAddModuleDialogOpen] = useState(false);
  const [isAddMilestoneDialogOpen, setIsAddMilestoneDialogOpen] = useState(false);
  const [isAddIssueDialogOpen, setIsAddIssueDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [isAddingProjectMember, setIsAddingProjectMember] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [memberRemovalPrompt, setMemberRemovalPrompt] = useState<{
    open: boolean;
    memberId: string | null;
    memberName: string;
  }>(DEFAULT_MEMBER_REMOVAL_PROMPT);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const isRemovingMemberRef = useRef(isRemovingMember);

  useEffect(() => {
    isRemovingMemberRef.current = isRemovingMember;
  }, [isRemovingMember]);

  // Fetch project data using React Query
  const { data: project, isLoading, error } = useProjectDetail(id);
  const { data: projectModules = [] } = useProjectModules(id);
  const { data: organizationMembers = [] } = useOrganizationMembers(currentOrganization?.id);
  const { data: projectMembers = [] } = useProjectMembers(id);

  // Mutation hooks
  const createTaskMutation = useCreateTask(id || '');
  const updateTaskMutation = useUpdateTask(id || '');
  const deleteTaskMutation = useDeleteTask(id || '');
  const createIssueMutation = useCreateIssue(id || '');
  const updateIssueMutation = useUpdateIssue(id || '');
  const deleteIssueMutation = useDeleteIssue(id || '');
  const createMilestoneMutation = useCreateMilestone(id || '');
  const updateMilestoneMutation = useUpdateMilestone(id || '');
  const deleteMilestoneMutation = useDeleteMilestone(id || '');
  const createModuleMutation = useCreateModule(id || '');
  const updateModuleMutation = useUpdateModule(id || '');
  const deleteModuleMutation = useDeleteModule(id || '');
  const batchUpdateTasksMutation = useBatchUpdateTasks(id || '');
  const batchUpdateModulesMutation = useBatchUpdateModules(id || '');
  const updateProjectMutation = useUpdateProject();

  // Update section from URL params
  useEffect(() => {
    if (tabParam) {
      setSection(tabParam);
    }
  }, [tabParam]);

  // Calculate active filter count - moved before early returns
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.priority?.length) count++;
    if (filters.module?.length) count++;
    if (filters.assignee?.length) count++;
    if (filters.milestoneId) count++;
    if (filters.dueDate) count++;
    if (filters.tags?.length) count++;
    if (filters.hasBlockers) count++;
    return count;
  }, [filters]);

  // Get unique team members from tasks - moved before early returns
  const teamMembers = useMemo(() => {
    if (!project?.tasks) return [];
    const members = new Map<string, { id: string; name: string; initials: string }>();
    project.tasks.forEach(task => {
      task.assignees?.forEach(assignee => {
        members.set(assignee.id, {
          id: assignee.id,
          name: assignee.name,
          initials: assignee.initials,
        });
      });
    });
    return Array.from(members.values());
  }, [project?.tasks]);

  // Get unique tags from tasks - moved before early returns
  const allTags = useMemo(() => {
    if (!project?.tasks) return [];
    const tags = new Set<string>();
    project.tasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [project?.tasks]);

  // Map database modules to frontend Module type
  const modules: Module[] = useMemo(() => {
    return projectModules.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.module_type,
      description: m.description || '',
      progress: m.progress || 0,
      status: m.status || 'active',
      owner: m.owner_id ? { id: m.owner_id, name: '', initials: '', email: '', role: 'member' } : undefined,
      createdAt: m.created_at || new Date().toISOString(),
    }));
  }, [projectModules]);

  const existingModuleNames = useMemo(() => modules.map(m => m.name), [modules]);

  // Calculate project progress breakdown
  const progressBreakdown = useMemo(() => {
    return calculateProjectProgress(
      project?.tasks || [],
      project?.milestones || [],
      modules,
      project?.issues || []
    );
  }, [project?.tasks, project?.milestones, modules, project?.issues]);

  // Refs for progress-sync effect (defined here so they're stable across renders)
  const updateProjectMutateRef = useRef(updateProjectMutation.mutate);
  updateProjectMutateRef.current = updateProjectMutation.mutate;
  const updateProjectIsPendingRef = useRef(updateProjectMutation.isPending);
  updateProjectIsPendingRef.current = updateProjectMutation.isPending;

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!project?.tasks || !searchQuery.trim()) return project?.tasks || [];
    const query = searchQuery.toLowerCase();
    return project.tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [project?.tasks, searchQuery]);

  const clearFilters = () => {
    setFilters({});
  };

  // Calculate active issue filter count
  const activeIssueFilterCount = useMemo(() => {
    let count = 0;
    if (issueFilters.status && issueFilters.status !== 'all') count++;
    if (issueFilters.severity && issueFilters.severity !== 'all') count++;
    if (issueFilters.assigneeId && issueFilters.assigneeId !== 'all') count++;
    if (issueFilters.hasDueDate !== undefined && issueFilters.hasDueDate !== 'all') count++;
    return count;
  }, [issueFilters]);

  const clearIssueFilters = () => {
    setIssueFilters({});
  };

  const canManageProjectMembers = useMemo(() => {
    if (!project || !user?.id) return false;
    if (project.createdBy === user.id) return true;
    const projectRole = (project.myRole || '').toLowerCase();
    return projectRole === 'admin';
  }, [project, user?.id]);

  const canAddModulesAndMilestones = useMemo(() => {
    if (!user?.id) return false;
    const membership = organizationMembers.find((member) => member.id === user.id);
    const orgRole = (membership?.role || '').toLowerCase();
    if (orgRole === 'admin' || orgRole === 'manager') return true;
    const projectRole = (project?.myRole || '').toLowerCase();
    return projectRole === 'admin' || projectRole === 'manager';
  }, [organizationMembers, user?.id, project?.myRole]);

  // Sync calculated progress — only for users who can PUT the project (manager/admin)
  useEffect(() => {
    if (
      project &&
      progressBreakdown.overallProgress !== project.progress &&
      !updateProjectIsPendingRef.current &&
      canAddModulesAndMilestones
    ) {
      updateProjectMutateRef.current({
        id: project.id,
        updates: { progress: progressBreakdown.overallProgress }
      });
    }
  }, [project, progressBreakdown.overallProgress, canAddModulesAndMilestones]);

  const canStartProjectChat = useMemo(() => {
    if (!project || !user?.id) return false;
    if (project.createdBy === user.id) return true;
    return !!project.myRole;
  }, [project, user?.id]);

  const availableOrganizationMembers = useMemo(() => {
    const projectMemberIds = new Set(projectMembers.map((member) => member.id));
    return organizationMembers.filter((member) => !projectMemberIds.has(member.id));
  }, [organizationMembers, projectMembers]);

  const selectedOrganizationMember = useMemo(
    () => availableOrganizationMembers.find((member) => member.id === selectedMemberToAdd),
    [availableOrganizationMembers, selectedMemberToAdd]
  );

  const handleAddProjectMember = async () => {
    if (!project || !selectedMemberToAdd) return;
    if (!canManageProjectMembers) {
      toast.error('Only the project creator or an Admin can add or remove members');
      return;
    }

    const isMemberAlreadyInProject = projectMembers.some((m) => m.id === selectedMemberToAdd);
    if (isMemberAlreadyInProject) {
      toast.error('Member is already in this project');
      return;
    }

    const isMemberInOrganization = availableOrganizationMembers.some(
      (m) => m.id === selectedMemberToAdd
    );
    if (!isMemberInOrganization) {
      toast.error('Selected member is no longer available');
      return;
    }

    setIsAddingProjectMember(true);
    try {
      await projectMembersService.addMember({
        project_id: project.id,
        user_id: selectedMemberToAdd,
        role: selectedOrganizationMember?.role || 'member',
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(currentOrganization?.id) });
      await queryClient.invalidateQueries({ queryKey: ['project-members', project.id] });

      toast.success('Member added to project');
      setSelectedMemberToAdd('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add member to project';
      toast.error(message);
    } finally {
      setIsAddingProjectMember(false);
    }
  };

  const handleStartProjectChat = async () => {
    if (!project) return;
    if (!canStartProjectChat) {
      toast.error('Only project team members can start this project chat');
      return;
    }

    setIsStartingChat(true);
    try {
      const timeoutMs = Number(import.meta.env.VITE_CHAT_START_PROJECT_TIMEOUT_MS ?? 6000);
      const maxAttempts = Number(import.meta.env.VITE_CHAT_START_PROJECT_MAX_ATTEMPTS ?? 2);
      const withTimeout = async <T,>(p: Promise<T>, ms: number, timeoutMessage: string): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms)),
        ]);

      const isNetworkError = (message: string) => {
        const m = message.toLowerCase();
        return (
          m.includes('network') ||
          m.includes('timeout') ||
          m.includes('failed to fetch') ||
          m.includes('fetch') ||
          m.includes('unavailable')
        );
      };

      let conversationId: string | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (attempt === 0) {
            conversationId = await withTimeout(
              chatService.getProjectGroupConversationId(project.id),
              timeoutMs,
              'Project chat lookup timed out'
            );
          }

          if (!conversationId) {
            // Ensure RPC is idempotent; we only do this when conversation mapping isn't present.
            conversationId = await withTimeout(
              chatService.ensureProjectGroup(project.id),
              timeoutMs,
              'Project chat start timed out'
            );
          }
        } catch (attemptErr) {
          const message = attemptErr instanceof Error ? attemptErr.message : 'Failed to start project chat';
          if (attempt >= maxAttempts - 1 || !isNetworkError(message)) throw attemptErr;
          conversationId = null;
          continue;
        }

        if (conversationId) break;
      }

      if (!conversationId) {
        throw new Error('Failed to start project chat. Please try again.');
      }

      navigate(`/chat/${conversationId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start project chat';
      if (message && message.toLowerCase().includes('access denied')) {
        toast.error('You no longer have access to start this project chat');
      } else if (message) {
        toast.error(message);
      } else {
        toast.error('Failed to start project chat. Please try again.');
      }
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleRemoveProjectMember = async (removeFromChatToo: boolean) => {
    if (!project || !memberRemovalPrompt.memberId) return;
    if (!canManageProjectMembers) {
      toast.error('Only the project creator or an Admin can add or remove members');
      return;
    }

    const isValidUuidLike = (value: unknown): value is string => {
      if (typeof value !== 'string') return false;
      return (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
        /^[0-9a-f]{32}$/i.test(value)
      );
    };

    const memberId = memberRemovalPrompt.memberId;
    if (!isValidUuidLike(project.id) || !isValidUuidLike(memberId)) {
      toast.error('Invalid member selection');
      return;
    }
    const isMemberInProject = projectMembers.some((m) => m.id === memberId);
    if (!isMemberInProject) {
      toast.error('That member is not part of this project anymore');
      return;
    }

    setIsRemovingMember(true);
    try {
      if (!removeFromChatToo) {
        await chatService.retainProjectChatMembershipAfterRemoval(project.id, [memberId]);
      }

      await projectMembersService.removeMember(project.id, memberId);

      if (removeFromChatToo) {
        // Only attempt chat cleanup if the project chat mapping exists.
        // Member removal from the project should not fail due to chat cleanup issues.
        try {
          const conversationId = await chatService.getProjectGroupConversationId(project.id);
          if (conversationId) {
            await chatService.forceRemoveProjectChatMembers(project.id, [memberId]);
          }
        } catch (chatErr) {
          logger.warn('[ProjectDetail] chat cleanup failed during member removal', {
            projectId: project.id,
            memberId,
            error: chatErr instanceof Error ? chatErr.message : String(chatErr),
          });
          toast.warning(
            'Member removed from project, but could not update project group chat',
            { description: chatErr instanceof Error ? chatErr.message : undefined }
          );
        }
      }

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(currentOrganization?.id) }),
        queryClient.invalidateQueries({ queryKey: ['project-members', project.id] }),
      ]);

      toast.success('Member removed from project');
      setMemberRemovalPrompt(DEFAULT_MEMBER_REMOVAL_PROMPT);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      toast.error(message);
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleIssueCreate = (newIssuePartial: Partial<Issue>) => {
    if (!project) return;

    createIssueMutation.mutate({
      title: newIssuePartial.title || 'New Issue',
      description: newIssuePartial.description || '',
      severity: newIssuePartial.severity || 'minor',
      category: newIssuePartial.category || 'other',
      assignees: newIssuePartial.assignees || [],
      reportedBy: { id: '', name: '', email: '', role: 'Member', initials: '' },
    } as Omit<Issue, 'id' | 'reportedAt'>);
  };

  const handleIssueUpdate = (updatedIssue: Issue) => {
    updateIssueMutation.mutate({
      issueId: updatedIssue.id,
      updates: updatedIssue,
    });
  };

  const handleAddModule = () => {
    setIsAddModuleDialogOpen(true);
  };

  const handleModuleAdd = (newModule: Omit<Module, 'id' | 'createdAt'>) => {
    createModuleMutation.mutate({
      name: newModule.name,
      module_type: newModule.type,
      description: newModule.description || undefined,
      status: 'active',
      progress: 0,
    });
    setIsAddModuleDialogOpen(false);
  };

  const handleModuleUpdate = async (updatedModule: Module): Promise<boolean> => {
    try {
      await updateModuleMutation.mutateAsync({
        moduleId: updatedModule.id,
        updates: {
          name: updatedModule.name,
          module_type: updatedModule.type,
          description: updatedModule.description || null,
          status: updatedModule.status || 'active',
          progress: updatedModule.progress ?? 0,
          owner_id: updatedModule.owner?.id || null,
          milestone_id: updatedModule.milestoneId || null,
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleMilestoneCreate = async (newMilestonePartial: Omit<Milestone, 'id'>) => {
    if (!project) return;

    try {
      const createdMilestone = await createMilestoneMutation.mutateAsync({
        name: newMilestonePartial.title,
        due_date: newMilestonePartial.date || null,
        description: newMilestonePartial.description || null,
        status: newMilestonePartial.completed ? 'completed' : 'upcoming',
      });

      // Link tasks if any were selected during creation
      if (newMilestonePartial.linkedTaskIds && newMilestonePartial.linkedTaskIds.length > 0) {
        batchUpdateTasksMutation.mutate(
          newMilestonePartial.linkedTaskIds.map(taskId => ({ id: taskId, updates: { milestoneId: createdMilestone.id } }))
        );
      }

      // Link modules if any were selected during creation
      if (newMilestonePartial.linkedModuleIds && newMilestonePartial.linkedModuleIds.length > 0) {
        batchUpdateModulesMutation.mutate(
          newMilestonePartial.linkedModuleIds.map(moduleId => ({ id: moduleId, milestone_id: createdMilestone.id }))
        );
      }
    } catch (error: any) {
      logger.error('Failed to create milestone and link tasks:', error);
      toast.error(error?.message || 'Failed to create milestone');
    }
  };

  const handleMilestoneUpdate = (updatedMilestone: Milestone) => {
    // Update milestone core fields
    updateMilestoneMutation.mutate({
      milestoneId: updatedMilestone.id,
      updates: {
        name: updatedMilestone.title,
        due_date: updatedMilestone.date || null,
        description: updatedMilestone.description || null,
        status: updatedMilestone.completed ? 'completed' : 'upcoming',
      },
    });

    // Persist linked task changes by updating ONLY each task's milestoneId field
    const previousLinkedTaskIds = (project?.tasks || [])
      .filter(t => t.milestoneId === updatedMilestone.id)
      .map(t => t.id);
    const newLinkedTaskIds = updatedMilestone.linkedTaskIds || [];

    const addedTaskIds = newLinkedTaskIds.filter(id => !previousLinkedTaskIds.includes(id));
    const removedTaskIds = previousLinkedTaskIds.filter(id => !newLinkedTaskIds.includes(id));

    const taskUpdates = [
      ...addedTaskIds.map(id => ({ id, updates: { milestoneId: updatedMilestone.id } })),
      ...removedTaskIds.map(id => ({ id, updates: { milestoneId: undefined } }))
    ];

    if (taskUpdates.length > 0) {
      batchUpdateTasksMutation.mutate(taskUpdates);
    }

    // Persist linked module changes
    const currentModules = project?.projectModules || [];
    const previousLinkedModuleIds = currentModules
      .filter(m => m.milestoneId === updatedMilestone.id)
      .map(m => m.id);
    const newLinkedModuleIds = updatedMilestone.linkedModuleIds || [];

    const addedModuleIds = newLinkedModuleIds.filter(id => !previousLinkedModuleIds.includes(id));
    const removedModuleIds = previousLinkedModuleIds.filter(id => !newLinkedModuleIds.includes(id));

    const moduleUpdates = [
      ...addedModuleIds.map(id => ({ id, milestone_id: updatedMilestone.id })),
      ...removedModuleIds.map(id => ({ id, milestone_id: null }))
    ];

    if (moduleUpdates.length > 0) {
      batchUpdateModulesMutation.mutate(moduleUpdates);
    }
  };


  const handleTaskCreate = async (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, pendingFiles?: File[]) => {
    const created = await createTaskMutation.mutateAsync(newTask);
    if (pendingFiles && pendingFiles.length > 0 && created?.id) {
      try {
        await Promise.all(
          pendingFiles.map(file =>
            attachmentsService.upload({
              entityId: created.id,
              entityType: 'task',
              projectId: id!,
              file,
            })
          )
        );
      } catch {
        toast.warning('Task created but some attachments failed to upload');
      }
    }
  };

  const handleTaskUpdate = async (updatedTask: Task, onError?: () => void) => {
    try {
      await updateTaskMutation.mutateAsync({
        taskId: updatedTask.id,
        updates: updatedTask,
      });
    } catch (error) {
      if (onError) onError();
      throw error;
    }
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleBatchTaskUpdate = async (updates: Array<{ id: string; updates: Partial<Task> }>) => {
    await batchUpdateTasksMutation.mutateAsync(updates);
  };

  const handleModuleDelete = (moduleId: string) => {
    deleteModuleMutation.mutate(moduleId);
  };

  const handleMilestoneDelete = (milestoneId: string) => {
    deleteMilestoneMutation.mutate(milestoneId);
  };

  const handleIssueDelete = (issueId: string) => {
    deleteIssueMutation.mutate(issueId);
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <ProjectDetailSkeleton />
      </>
    );
  }

  // Error or not found state
  if (error || !project) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-xl font-medium">Project not found</h2>
          <p className="text-muted-foreground mt-2">
            {error ? 'An error occurred while loading the project.' : 'The project you are looking for does not exist.'}
          </p>
          <Button asChild className="mt-4">
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </>
    );
  }

  const openIssuesCount = project.issues?.filter(i => i.status !== 'resolved' && i.status !== 'closed').length || 0;
  const criticalIssuesCount = project.issues?.filter(i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length || 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 animate-fade-in w-full min-w-0">
        {/* Project Stats with Title */}
        <div className={cn(
          "flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3 border-y",
          isMobile && "rounded-xl border bg-card/60 px-3 py-3"
        )}>
          {/* Left: Project Title and Stage */}
          <div className={cn("flex items-center gap-2 sm:gap-3 min-w-0 w-full md:w-auto md:flex-1", isMobile && "pb-1")}>
            <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1 -ml-2 h-8 px-2 text-muted-foreground hover:text-foreground">
              <Link to="/projects">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight truncate">{project.name}</h1>
              <Badge variant="secondary" className={cn(stageColors[project.stage], "shrink-0")}>
                {project.stage.charAt(0).toUpperCase() + project.stage.slice(1)}
              </Badge>
            </div>
            {isMobile && (
              <div className="ml-1 flex items-center justify-end gap-2 shrink-0 rounded-lg border border-border/70 bg-background/80 px-2 py-1.5">
                <Progress value={progressBreakdown.overallProgress} className="w-16 h-2" />
                <span className="text-xs font-semibold text-muted-foreground leading-none">
                  {progressBreakdown.overallProgress}%
                </span>
              </div>
            )}
          </div>

          {/* Right: Stats */}
          <div className="w-full md:w-auto overflow-visible md:overflow-x-auto md:pl-4">
            <div className={cn(
              "flex flex-wrap md:flex-nowrap items-center gap-3 sm:gap-4 md:gap-6 w-full text-xs sm:text-sm text-muted-foreground pb-1 md:pb-0",
              isMobile && "gap-2"
            )}>
              <div className={cn(
                "flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6 w-full md:w-auto md:ml-auto",
                isMobile && "order-1 rounded-lg border bg-background/70 px-2 py-2"
              )}>
                {!isMobile && <ProjectProgressPopover breakdown={progressBreakdown} />}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Due {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'Not set'}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("h-8 gap-1.5 whitespace-nowrap", isMobile && "h-9 rounded-lg")}
                  onClick={handleStartProjectChat}
                  disabled={isStartingChat || !canStartProjectChat}
                >
                  {isStartingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  <span>Start Chat</span>
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-md border border-foreground/50 px-2 py-1 text-foreground hover:bg-muted transition-colors",
                        isMobile && "h-9 rounded-lg border-border px-2.5"
                      )}
                    >
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-xs font-medium">Team</span>
                      <span className="text-xs">{projectMembers.length}</span>
                      <div className="hidden md:flex -space-x-2">
                        {projectMembers.slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-5 w-5 md:h-6 md:w-6 border-2 border-background">
                            <AvatarFallback className="text-[10px] bg-muted">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Project Team</p>
                      {projectMembers.length > 0 ? (
                        <div className="space-y-2 max-h-52 overflow-y-auto">
                          {projectMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="text-[11px]">
                                    {member.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">{member.name}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] max-w-[120px] truncate">
                                {member.role || 'Member'}
                              </Badge>
                              {canManageProjectMembers && member.role?.toLowerCase() !== 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    const memberId = member.id;
                                    const memberName = typeof member.name === 'string' ? member.name : '';
                                    if (!memberId) return;
                                    setMemberRemovalPrompt({
                                      open: true,
                                      memberId,
                                      memberName,
                                    });
                                  }}
                                  title="Remove member"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No team members assigned yet.</p>
                      )}

                      {canManageProjectMembers ? (
                        <div className="pt-3 mt-2 border-t space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Add Member</p>
                          <div className="space-y-2">
                            <Select value={selectedMemberToAdd} onValueChange={setSelectedMemberToAdd}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select organization member" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableOrganizationMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedOrganizationMember && (
                              <p className="text-[11px] text-muted-foreground">
                                Role will be inherited automatically from organization:{" "}
                                <span className="font-medium text-foreground capitalize">
                                  {selectedOrganizationMember.role || 'member'}
                                </span>
                              </p>
                            )}
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={handleAddProjectMember}
                              disabled={
                                isAddingProjectMember ||
                                !selectedMemberToAdd ||
                                availableOrganizationMembers.length === 0
                              }
                              title={
                                availableOrganizationMembers.length === 0
                                  ? 'All organization members are already in this project'
                                  : undefined
                              }
                            >
                              {isAddingProjectMember && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Add Member
                            </Button>
                            {availableOrganizationMembers.length === 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                All organization members are already in this project.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 mt-2 border-t">
                          <p className="text-[11px] text-muted-foreground">
                            Only the project creator or an Admin can add or remove project members.
                          </p>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {criticalIssuesCount > 0 && (
                <Badge variant="destructive" className="gap-1 shrink-0 hidden sm:inline-flex">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {criticalIssuesCount} Critical Issue{criticalIssuesCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Section Tabs - Entity-based navigation */}
        <Tabs value={section} onValueChange={(v) => setSection(v as ProjectSection)} className="w-full">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Left Side: Tabs and Filters */}
            <div className="w-full py-1 md:mr-auto md:w-auto">
              <TabsList className="bg-muted/50 grid grid-cols-8 w-full h-9 md:w-auto md:flex md:shrink-0">
                <TabsTrigger value="bom" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Bill of Materials">
                  <Layers className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">BOM</span>}
                </TabsTrigger>
                <TabsTrigger value="eng-changes" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Engineering Changes">
                  <GitMerge className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Eng. Changes</span>}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Tasks">
                  <ListTodo className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Tasks</span>}
                  {!isMobile && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] shrink-0">
                      {(project.tasks || []).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="modules" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Modules">
                  <Boxes className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Modules</span>}
                  {!isMobile && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] shrink-0">
                      {modules.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="milestones" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Milestones">
                  <Flag className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Milestones</span>}
                  {!isMobile && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] shrink-0">
                      {(project.milestones || []).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="issues" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Issues">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Issues</span>}
                  {!isMobile && openIssuesCount > 0 && (
                    <Badge variant={criticalIssuesCount > 0 ? "destructive" : "secondary"} className="ml-1 h-5 px-1.5 text-[10px] shrink-0">
                      {openIssuesCount}
                    </Badge>
                  )}
                </TabsTrigger>
                {/* <TabsTrigger value="requirements" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Requirements">
                  <ListChecks className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Requirements</span>}
                </TabsTrigger> */}
                {/* <TabsTrigger value="gate-reviews" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Phase Gate Tracker">
                  <ChartGantt className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Gates</span>}
                </TabsTrigger> */}
                {/* <TabsTrigger value="risk" className="gap-1 sm:gap-2 px-2 justify-center min-w-0 overflow-hidden" title="Risk & Issue Tracker">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {!isMobile && <span className="truncate">Risk</span>}
                </TabsTrigger> */}
              </TabsList>
            </div>

            {/* Right Side: View Controls */}
            <div className="flex-1 min-w-0 md:max-w-[60%]">
              {section === 'tasks' && (
                <div className="flex items-center gap-2 w-full justify-end min-w-0 flex-nowrap overflow-x-auto no-scrollbar py-1">
                  <ViewControls
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                  />
                  <TaskFiltersDropdown
                    milestones={project.milestones || []}
                    modules={modules.map(m => ({ id: m.id, name: m.name, type: m.type }))}
                    teamMembers={teamMembers}
                    allTags={allTags}
                    filters={filters}
                    onFiltersChange={setFilters}
                    activeFilterCount={activeFilterCount}
                  />
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-1 text-muted-foreground hover:text-foreground h-9 px-2 shrink-0"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">Clear</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setIsAddTaskDialogOpen(true)}
                    className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-0 w-9 sm:w-auto sm:px-3 rounded-lg"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Task</span>
                  </Button>
                </div>
              )}
              {section === 'modules' && (
                <ModuleViewControls
                  viewMode={moduleViewMode}
                  onViewModeChange={setModuleViewMode}
                  searchQuery={moduleSearchQuery}
                  onSearchQueryChange={setModuleSearchQuery}
                  onAddModule={canAddModulesAndMilestones ? handleAddModule : undefined}
                />
              )}
              {section === 'milestones' && (
                <MilestoneViewControls
                  viewMode={milestoneViewMode}
                  onViewModeChange={setMilestoneViewMode}
                  searchQuery={milestoneSearchQuery}
                  onSearchQueryChange={setMilestoneSearchQuery}
                  onAddMilestone={canAddModulesAndMilestones ? () => setIsAddMilestoneDialogOpen(true) : undefined}
                />
              )}
              {section === 'issues' && (
                <IssueViewControls
                  viewMode={issueViewMode}
                  onViewModeChange={setIssueViewMode}
                  searchQuery={issueSearchQuery}
                  onSearchQueryChange={setIssueSearchQuery}
                  filters={issueFilters}
                  onFiltersChange={setIssueFilters}
                  teamMembers={organizationMembers}
                  activeFilterCount={activeIssueFilterCount}
                  onClearFilters={clearIssueFilters}
                  onReportIssue={() => setIsAddIssueDialogOpen(true)}
                />
              )}
              {section === 'bom' && (
                <div className="flex items-center gap-2 w-full justify-end min-w-0 flex-nowrap overflow-x-auto no-scrollbar py-1">
                  {/* <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
                    <Upload className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Import</span>
                  </Button> */}
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button size="sm" onClick={() => setBomAddOpen(true)} className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-0 w-9 sm:w-auto sm:px-3 rounded-lg">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Part</span>
                  </Button>
                </div>
              )}
              {section === 'eng-changes' && (
                <div className="flex items-center gap-2 w-full justify-end min-w-0 flex-nowrap overflow-x-auto no-scrollbar py-1">
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button size="sm" onClick={() => setEcoNewOpen(true)} className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-0 w-9 sm:w-auto sm:px-3 rounded-lg">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New ECO</span>
                  </Button>
                </div>
              )}
              {section === 'gate-reviews' && (
                <div className="flex items-center gap-2 w-full justify-end min-w-0 flex-nowrap overflow-x-auto no-scrollbar py-1">
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button size="sm" className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-0 w-9 sm:w-auto sm:px-3 rounded-lg">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Gate</span>
                  </Button>
                </div>
              )}
              {section === 'risk' && (
                <div className="flex items-center gap-2 w-full justify-end min-w-0 flex-nowrap overflow-x-auto no-scrollbar py-1">
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button size="sm" className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-0 w-9 sm:w-auto sm:px-3 rounded-lg">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Risk</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="tasks" className="mt-6">
            <TasksSection
              tasks={filteredTasks}
              allTasks={project.tasks || []}
              projectId={project.id}
              milestones={project.milestones || []}
              issues={project.issues || []}
              modules={modules.map(m => ({ id: m.id, name: m.name, type: m.type }))}
              assignableMembers={organizationMembers}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filters={filters}
              onFiltersChange={setFilters}
              onTaskCreate={handleTaskCreate}
              onTaskUpdate={handleTaskUpdate}
              onBatchTaskUpdate={handleBatchTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onAddModule={canAddModulesAndMilestones ? handleAddModule : undefined}
            />
          </TabsContent>
          <TabsContent value="modules" className="mt-6">
            <ModulesSection
              modules={modules}
              tasks={project.tasks || []}
              issues={project.issues || []}
              teamMembers={organizationMembers}
              viewMode={moduleViewMode}
              onViewModeChange={setModuleViewMode}
              searchQuery={moduleSearchQuery}
              isAddDialogOpen={isAddModuleDialogOpen}
              onAddDialogClose={() => setIsAddModuleDialogOpen(false)}
              onModuleAdd={handleModuleAdd}
              onModuleUpdate={handleModuleUpdate}
              onModuleDelete={handleModuleDelete}
              onTaskUpdate={handleTaskUpdate}
              onIssueUpdate={handleIssueUpdate}
            />
          </TabsContent>
          <TabsContent value="milestones" className="mt-6">
            <MilestonesView
              milestones={project.milestones || []}
              tasks={project.tasks || []}
              issues={project.issues || []}
              modules={modules}
              viewMode={milestoneViewMode}
              projectStartDate={project.startDate ? new Date(project.startDate) : undefined}
              searchQuery={milestoneSearchQuery}
              isAddDialogOpen={isAddMilestoneDialogOpen}
              onAddDialogClose={() => setIsAddMilestoneDialogOpen(false)}
              onMilestoneUpdate={handleMilestoneUpdate}
              onMilestoneCreate={handleMilestoneCreate}
              onMilestoneDelete={handleMilestoneDelete}
              onIssueUpdate={handleIssueUpdate}
            />
          </TabsContent>
          <TabsContent value="issues" className="mt-6">
            <IssuesView
              issues={project.issues || []}
              viewMode={issueViewMode}
              tasks={project.tasks || []}
              teamMembers={organizationMembers}
              searchQuery={issueSearchQuery}
              severityFilter={issueFilters.severity}
              statusFilter={issueFilters.status}
              assigneeFilter={issueFilters.assigneeId}
              dueDateFilter={issueFilters.hasDueDate}
              isAddDialogOpen={isAddIssueDialogOpen}
              onAddDialogClose={() => setIsAddIssueDialogOpen(false)}
              onIssueCreate={handleIssueCreate}
              onIssueUpdate={handleIssueUpdate}
              onIssueDelete={handleIssueDelete}
            />
          </TabsContent>
          <TabsContent value="bom" className="mt-0 -mx-6 -mb-6 flex flex-col">
            <BOMView
              projectId={project.id}
              orgId={currentOrganization?.id ?? ''}
              addOpen={bomAddOpen}
              onAddClose={() => setBomAddOpen(false)}
            />
          </TabsContent>
          <TabsContent value="requirements" className="mt-6 -mx-6 -mb-6 flex flex-col">
            <RequirementsView />
          </TabsContent>
          <TabsContent value="eng-changes" className="mt-6 -mx-6 -mb-6 flex flex-col">
            <ECOView projectId={id!} newTrigger={ecoNewOpen} onNewConsumed={() => setEcoNewOpen(false)} />
          </TabsContent>
          <TabsContent value="gate-reviews" className="mt-6">
            <GateView />
          </TabsContent>
          <TabsContent value="risk" className="mt-6">
            <RiskView />
          </TabsContent>
        </Tabs>
      </div>

      <AddModuleDialog
        isOpen={isAddModuleDialogOpen}
        onClose={() => setIsAddModuleDialogOpen(false)}
        onAdd={handleModuleAdd}
        teamMembers={organizationMembers}
        existingModuleNames={existingModuleNames}
      />

      <TaskDetailModal
        task={null}
        allTasks={project.tasks || []}
        isOpen={isAddTaskDialogOpen}
        onClose={() => setIsAddTaskDialogOpen(false)}
        onUpdate={handleTaskUpdate}
        mode="create"
        onCreate={handleTaskCreate}
        modules={modules}
        projectId={id}
        onAddModule={canAddModulesAndMilestones ? handleAddModule : undefined}
        assignableMembers={organizationMembers}
        statusOptions={(boardColumns ?? []).map((c) => ({
          value: c.status,
          label: c.label,
          color: c.color,   // hex kept as-is; TaskDetailModal dot uses inline style
        }))}
      />

      <Dialog
        open={memberRemovalPrompt.open}
        onOpenChange={(open) => {
          if (!open && !isRemovingMemberRef.current) {
            setMemberRemovalPrompt(DEFAULT_MEMBER_REMOVAL_PROMPT);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member from project?</DialogTitle>
            <DialogDescription>
              {memberRemovalPrompt.memberName
                ? `${memberRemovalPrompt.memberName} will be removed from this project. Should they also be removed from the project group chat, or kept in that chat?`
                : 'This person will be removed from the project. Should they also be removed from the project group chat, or kept in that chat?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberRemovalPrompt(DEFAULT_MEMBER_REMOVAL_PROMPT)}
              disabled={isRemovingMember}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRemoveProjectMember(false)}
              disabled={isRemovingMember}
            >
              No, keep in chat
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRemoveProjectMember(true)}
              disabled={isRemovingMember}
            >
              {isRemovingMember ? 'Removing...' : 'Yes, remove from chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
