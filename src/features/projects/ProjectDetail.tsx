import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ListTodo, Boxes, Flag, AlertTriangle, Users, Calendar, Search, X, Plus, Filter, User, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { useProjectDetail, useProjectModules } from '@/hooks/useProjectDetail';
import { useUpdateProject } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useProjectTeam';
import {
  useCreateTask,
  useUpdateTask,
  useCreateIssue,
  useUpdateIssue,
  useCreateMilestone,
  useUpdateMilestone,
  useCreateModule,
} from '@/hooks/useProjectMutations';
import { cn } from '@/lib/utils';
import { calculateProjectProgress } from './utils/projectUtils';
import { ProjectSection, Module, TaskViewMode, TaskFilter, ModuleViewMode, Issue, Milestone, Task, IssueStatus, IssueSeverity, TeamMember } from '@/types';

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

// Milestone View Controls Component
function MilestoneViewControls({
  searchQuery,
  onSearchQueryChange,
  onAddMilestone,
}: {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onAddMilestone: () => void;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Search Icon / Input */}
      <div className="flex items-center">
        {isSearchOpen ? (
          <div className="flex items-center gap-1">
            <Input
              type="text"
              placeholder="Search milestones..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="h-8 w-40"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsSearchOpen(false);
                onSearchQueryChange('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Button size="sm" className="gap-2" onClick={onAddMilestone}>
        <Plus className="h-4 w-4" />
        Add Milestone
      </Button>
    </div>
  );
}

// Issue View Controls Component
function IssueViewControls({
  searchQuery,
  onSearchQueryChange,
  filters,
  onFiltersChange,
  teamMembers,
  activeFilterCount,
  onClearFilters,
  onReportIssue,
}: {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filters: IssueFilter;
  onFiltersChange: (filters: IssueFilter) => void;
  teamMembers: TeamMember[];
  activeFilterCount: number;
  onClearFilters: () => void;
  onReportIssue: () => void;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Search Icon / Input */}
      <div className="flex items-center">
        {isSearchOpen ? (
          <div className="flex items-center gap-1">
            <Input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="h-8 w-40"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsSearchOpen(false);
                onSearchQueryChange('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
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

      <Button size="sm" className="gap-2" onClick={onReportIssue}>
        <Plus className="h-4 w-4" />
        Report Issue
      </Button>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab') as ProjectSection;

  const [section, setSection] = useState<ProjectSection>(tabParam || 'tasks');
  const [viewMode, setViewMode] = useState<TaskViewMode>('kanban');
  const [moduleViewMode, setModuleViewMode] = useState<ModuleViewMode>('kanban');
  const [filters, setFilters] = useState<TaskFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [milestoneSearchQuery, setMilestoneSearchQuery] = useState('');
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  const [issueFilters, setIssueFilters] = useState<IssueFilter>({});
  const [isAddModuleDialogOpen, setIsAddModuleDialogOpen] = useState(false);
  const [isAddMilestoneDialogOpen, setIsAddMilestoneDialogOpen] = useState(false);
  const [isAddIssueDialogOpen, setIsAddIssueDialogOpen] = useState(false);

  // Fetch project data using React Query
  const { data: project, isLoading, error } = useProjectDetail(id);
  const { data: projectModules = [] } = useProjectModules(id);
  const { data: allTeamMembers = [] } = useTeamMembers();

  // Mutation hooks
  const createTaskMutation = useCreateTask(id || '');
  const updateTaskMutation = useUpdateTask(id || '');
  const createIssueMutation = useCreateIssue(id || '');
  const updateIssueMutation = useUpdateIssue(id || '');
  const createMilestoneMutation = useCreateMilestone(id || '');
  const updateMilestoneMutation = useUpdateMilestone(id || '');
  const createModuleMutation = useCreateModule(id || '');
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
    return projectModules.map((m: any) => ({
      id: m.id,
      name: m.name,
      type: m.module_type,
      description: m.description || '',
      progress: m.progress || 0,
      status: m.status || 'active',
      owner: m.owner_id ? { id: m.owner_id, name: '', initials: '', email: '', role: 'member' } : undefined,
      createdAt: m.created_at,
    }));
  }, [projectModules]);

  // Calculate project progress breakdown
  const progressBreakdown = useMemo(() => {
    return calculateProjectProgress(
      project?.tasks || [],
      project?.milestones || [],
      modules,
      project?.issues || []
    );
  }, [project?.tasks, project?.milestones, modules, project?.issues]);

  // Sync calculated progress with project progress
  useEffect(() => {
    if (
      project &&
      progressBreakdown.overallProgress !== project.progress &&
      !updateProjectMutation.isPending
    ) {
      updateProjectMutation.mutate({
        id: project.id,
        updates: { progress: progressBreakdown.overallProgress }
      });
    }
  }, [project, progressBreakdown.overallProgress, updateProjectMutation]);

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

  const handleIssueCreate = (newIssuePartial: Partial<Issue>) => {
    if (!project) return;

    createIssueMutation.mutate({
      projectId: project.id,
      title: newIssuePartial.title || 'New Issue',
      description: newIssuePartial.description || '',
      status: 'open',
      severity: newIssuePartial.severity || 'minor',
      category: newIssuePartial.category || 'other',
      assignees: newIssuePartial.assignees || [],
      reportedBy: {
        id: 'current-user',
        name: 'Current User',
        email: '',
        role: 'member',
        initials: 'CU',
      },
      descriptionBlocks: newIssuePartial.descriptionBlocks || [],
      ...newIssuePartial,
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
      description: newModule.description || null,
      status: 'active',
      progress: 0,
    });
    setIsAddModuleDialogOpen(false);
  };

  const handleMilestoneCreate = (newMilestonePartial: Omit<Milestone, 'id'>) => {
    if (!project) return;

    createMilestoneMutation.mutate({
      name: newMilestonePartial.title,
      due_date: newMilestonePartial.date || null,
      description: newMilestonePartial.description || null,
      status: newMilestonePartial.completed ? 'completed' : 'upcoming',
    });
  };

  const handleMilestoneUpdate = (updatedMilestone: Milestone) => {
    updateMilestoneMutation.mutate({
      milestoneId: updatedMilestone.id,
      updates: {
        name: updatedMilestone.title,
        due_date: updatedMilestone.date || null,
        description: updatedMilestone.description || null,
        status: updatedMilestone.completed ? 'completed' : 'upcoming',
      },
    });
  };

  const handleTaskCreate = (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    createTaskMutation.mutate(newTask);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    updateTaskMutation.mutate({
      taskId: updatedTask.id,
      updates: updatedTask,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <ProjectDetailSkeleton />
      </AppLayout>
    );
  }

  // Error or not found state
  if (error || !project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-xl font-medium">Project not found</h2>
          <p className="text-muted-foreground mt-2">
            {error ? 'An error occurred while loading the project.' : 'The project you are looking for does not exist.'}
          </p>
          <Button asChild className="mt-4">
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const openIssuesCount = project.issues?.filter(i => i.status !== 'resolved' && i.status !== 'closed').length || 0;
  const criticalIssuesCount = project.issues?.filter(i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length || 0;

  return (
    <AppLayout>
      <div className="grid grid-cols-1 gap-6 animate-fade-in w-full min-w-0">
        {/* Project Stats with Title */}
        <div className="flex items-center justify-between gap-6 py-4 border-y">
          {/* Left: Project Title and Stage */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant="secondary" className={cn(stageColors[project.stage])}>
              {project.stage.charAt(0).toUpperCase() + project.stage.slice(1)}
            </Badge>
          </div>

          {/* Right: Stats */}
          <div className="flex flex-wrap items-center gap-6">
            <ProjectProgressPopover breakdown={progressBreakdown} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'Not set'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {(project.team || []).slice(0, 5).map((member) => (
                  <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-[10px] bg-muted">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
            {criticalIssuesCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalIssuesCount} Critical Issue{criticalIssuesCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Section Tabs - Entity-based navigation */}
        <Tabs value={section} onValueChange={(v) => setSection(v as ProjectSection)} className="w-full">
          <div className="flex items-center justify-between gap-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="tasks" className="gap-2">
                <ListTodo className="h-4 w-4" />
                Tasks
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {(project.tasks || []).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="modules" className="gap-2">
                <Boxes className="h-4 w-4" />
                Modules
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {modules.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-2">
                <Flag className="h-4 w-4" />
                Milestones
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {(project.milestones || []).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="issues" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issues
                {openIssuesCount > 0 && (
                  <Badge variant={criticalIssuesCount > 0 ? "destructive" : "secondary"} className="ml-1 h-5 px-1.5 text-[10px]">
                    {openIssuesCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* View Controls - only show for tasks section */}
            {section === 'tasks' && (
              <ViewControls
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                filters={filters}
                onFiltersChange={setFilters}
                milestones={project.milestones || []}
                modules={modules.map(m => ({ id: m.id, name: m.name, type: m.type }))}
                teamMembers={teamMembers}
                allTags={allTags}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />
            )}
            {/* Module View Controls - show for modules section */}
            {section === 'modules' && (
              <ModuleViewControls
                viewMode={moduleViewMode}
                onViewModeChange={setModuleViewMode}
                onAddModule={handleAddModule}
                searchQuery={moduleSearchQuery}
                onSearchQueryChange={setModuleSearchQuery}
              />
            )}
            {/* Milestones View Controls */}
            {section === 'milestones' && (
              <MilestoneViewControls
                searchQuery={milestoneSearchQuery}
                onSearchQueryChange={setMilestoneSearchQuery}
                onAddMilestone={() => setIsAddMilestoneDialogOpen(true)}
              />
            )}
            {/* Issues View Controls */}
            {section === 'issues' && (
              <IssueViewControls
                searchQuery={issueSearchQuery}
                onSearchQueryChange={setIssueSearchQuery}
                filters={issueFilters}
                onFiltersChange={setIssueFilters}
                teamMembers={allTeamMembers}
                activeFilterCount={activeIssueFilterCount}
                onClearFilters={clearIssueFilters}
                onReportIssue={() => setIsAddIssueDialogOpen(true)}
              />
            )}
          </div>

          <TabsContent value="tasks" className="mt-6">
            <TasksSection
              tasks={filteredTasks}
              projectId={project.id}
              milestones={project.milestones || []}
              issues={project.issues || []}
              modules={modules.map(m => ({ id: m.id, name: m.name, type: m.type }))}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filters={filters}
              onFiltersChange={setFilters}
              onTaskCreate={handleTaskCreate}
              onTaskUpdate={handleTaskUpdate}
              onAddModule={handleAddModule}
            />
          </TabsContent>
          <TabsContent value="modules" className="mt-6">
            <ModulesSection
              modules={modules}
              tasks={project.tasks || []}
              issues={project.issues || []}
              teamMembers={allTeamMembers}
              viewMode={moduleViewMode}
              onViewModeChange={setModuleViewMode}
              searchQuery={moduleSearchQuery}
              isAddDialogOpen={isAddModuleDialogOpen}
              onAddDialogClose={() => setIsAddModuleDialogOpen(false)}
              onModuleAdd={handleModuleAdd}
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
              searchQuery={milestoneSearchQuery}
              isAddDialogOpen={isAddMilestoneDialogOpen}
              onAddDialogClose={() => setIsAddMilestoneDialogOpen(false)}
              onMilestoneUpdate={handleMilestoneUpdate}
              onMilestoneCreate={handleMilestoneCreate}
              onIssueUpdate={handleIssueUpdate}
            />
          </TabsContent>
          <TabsContent value="issues" className="mt-6">
            <IssuesView
              issues={project.issues || []}
              tasks={project.tasks || []}
              teamMembers={allTeamMembers}
              searchQuery={issueSearchQuery}
              severityFilter={issueFilters.severity}
              statusFilter={issueFilters.status}
              assigneeFilter={issueFilters.assigneeId}
              dueDateFilter={issueFilters.hasDueDate}
              isAddDialogOpen={isAddIssueDialogOpen}
              onAddDialogClose={() => setIsAddIssueDialogOpen(false)}
              onIssueCreate={handleIssueCreate}
              onIssueUpdate={handleIssueUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
