import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ListTodo, Boxes, Flag, AlertTriangle, Users, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TasksSection, ViewControls } from '@/components/project/TasksSection';
import { ModulesSection, ModuleViewControls } from '@/components/project/ModulesSection';
import { MilestonesView } from '@/components/project/MilestonesView';
import { IssuesView } from '@/components/project/IssuesView';
import { projects, projectModules, teamMembers as allTeamMembers } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { ProjectSection, Module, TaskViewMode, TaskFilter, ModuleViewMode, Project, Issue } from '@/types';

const stageColors = {
  concept: 'bg-muted text-muted-foreground',
  design: 'bg-chart-1/10 text-chart-1',
  development: 'bg-chart-2/10 text-chart-2',
  testing: 'bg-chart-4/10 text-chart-4',
  production: 'bg-chart-3/10 text-chart-3',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab') as ProjectSection;
  
  const [section, setSection] = useState<ProjectSection>(tabParam || 'tasks');
  const [viewMode, setViewMode] = useState<TaskViewMode>('kanban');
  const [moduleViewMode, setModuleViewMode] = useState<ModuleViewMode>('kanban');
  const [filters, setFilters] = useState<TaskFilter>({});
  const [isAddModuleDialogOpen, setIsAddModuleDialogOpen] = useState(false);
  
  const [projectData, setProjectData] = useState<Project | undefined>(() => projects.find(p => p.id === id));

  useEffect(() => {
    setProjectData(projects.find(p => p.id === id));
  }, [id]);
  
  const project = projectData;

  const handleIssueCreate = (newIssuePartial: Partial<Issue>) => {
    if (!project) return;
    
    const newIssue: Issue = {
      id: `issue-${Date.now()}`,
      projectId: project.id,
      title: newIssuePartial.title || 'New Issue',
      description: newIssuePartial.description || '',
      status: 'open',
      severity: 'minor',
      category: 'other',
      priority: 'medium',
      reportedAt: new Date().toISOString(),
      assignees: [],
      tags: [],
      blocksTaskIds: [],
      blocksMilestoneIds: [],
      blockedByTaskIds: [],
      blockedByMilestoneIds: [],
      descriptionBlocks: newIssuePartial.descriptionBlocks || [],
      ...newIssuePartial
    } as Issue;

    // Mutate mock data for persistence across navigation
    const originalProject = projects.find(p => p.id === project.id);
    if (originalProject) {
       if (!originalProject.issues) originalProject.issues = [];
       // Add to start
       originalProject.issues.unshift(newIssue);
    }

    setProjectData(prev => prev ? ({
      ...prev,
      issues: [newIssue, ...(prev.issues || [])]
    }) : prev);
  };

  const handleIssueUpdate = (updatedIssue: Issue) => {
    setProjectData(prev => prev ? ({
      ...prev,
      issues: prev.issues?.map(i => i.id === updatedIssue.id ? updatedIssue : i) || []
    }) : prev);
  };

  const handleAddModule = () => {
    setIsAddModuleDialogOpen(true);
  };

  const handleModuleAdd = (newModule: Omit<Module, 'id' | 'createdAt'>) => {
    const module: Module = {
      ...newModule,
      id: `module-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    // Add to modules (in real app, this would update state/database)
    projectModules.push(module);
    console.log('Module added:', module);
    setIsAddModuleDialogOpen(false);
  };

  if (!project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-xl font-medium">Project not found</h2>
          <Button asChild className="mt-4">
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Get project modules - use projectModules for now (in real app, filter by projectId)
  const modules: Module[] = projectModules;

  const openIssuesCount = project.issues?.filter(i => i.status !== 'resolved' && i.status !== 'closed').length || 0;
  const criticalIssuesCount = project.issues?.filter(i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length || 0;

  // Calculate active filter count
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

  const clearFilters = () => {
    setFilters({});
  };

  // Get unique team members from tasks
  const teamMembers = useMemo(() => {
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
  }, [project.tasks]);

  // Get unique tags from tasks
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    project.tasks.forEach(task => {
      task.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [project.tasks]);

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
            <div className="flex items-center gap-2">
              <Progress value={project.progress} className="w-24 h-2" />
              <span className="text-sm font-medium">{project.progress}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due {new Date(project.targetDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {project.team.slice(0, 5).map((member) => (
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
                  {project.tasks.length}
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
                  {project.milestones.length}
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
                milestones={project.milestones}
                modules={modules.map(m => ({ id: m.id, name: m.name, type: m.type }))}
                teamMembers={teamMembers}
                allTags={allTags}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
              />
            )}
            {/* Module View Controls - show for modules section */}
            {section === 'modules' && (
              <ModuleViewControls
                viewMode={moduleViewMode}
                onViewModeChange={setModuleViewMode}
                onAddModule={handleAddModule}
              />
            )}
          </div>

          <TabsContent value="tasks" className="mt-6">
            <TasksSection 
              tasks={project.tasks} 
              milestones={project.milestones}
              issues={project.issues || []}
              modules={modules.map(m => ({ id: m.id, name: m.name, type: m.type }))}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </TabsContent>
          <TabsContent value="modules" className="mt-6">
            <ModulesSection 
              modules={modules} 
              tasks={project.tasks}
              issues={project.issues || []}
              teamMembers={allTeamMembers}
              viewMode={moduleViewMode}
              onViewModeChange={setModuleViewMode}
              isAddDialogOpen={isAddModuleDialogOpen}
              onAddDialogClose={() => setIsAddModuleDialogOpen(false)}
              onModuleAdd={handleModuleAdd}
            />
          </TabsContent>
          <TabsContent value="milestones" className="mt-6">
            <MilestonesView 
              milestones={project.milestones} 
              tasks={project.tasks} 
              issues={project.issues || []}
            />
          </TabsContent>
          <TabsContent value="issues" className="mt-6">
            <IssuesView 
              issues={project.issues || []} 
              tasks={project.tasks}
              onIssueCreate={handleIssueCreate}
              onIssueUpdate={handleIssueUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
