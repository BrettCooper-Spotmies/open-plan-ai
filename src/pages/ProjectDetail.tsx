import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, GanttChart, List, GitBranch, Users, Calendar, MoreHorizontal, Flag, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { KanbanView } from '@/components/project/KanbanView';
import { TimelineView } from '@/components/project/TimelineView';
import { ListView } from '@/components/project/ListView';
import { DependencyView } from '@/components/project/DependencyView';
import { MilestonesView } from '@/components/project/MilestonesView';
import { IssuesView } from '@/components/project/IssuesView';
import { projects } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { ProjectView } from '@/types';

const stageColors = {
  concept: 'bg-muted text-muted-foreground',
  design: 'bg-chart-1/10 text-chart-1',
  development: 'bg-chart-2/10 text-chart-2',
  testing: 'bg-chart-4/10 text-chart-4',
  production: 'bg-chart-3/10 text-chart-3',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [view, setView] = useState<ProjectView>('kanban');
  
  const project = projects.find(p => p.id === id);

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

  const openIssuesCount = project.issues?.filter(i => i.status !== 'resolved' && i.status !== 'closed').length || 0;
  const criticalIssuesCount = project.issues?.filter(i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length || 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="mt-1">
              <Link to="/projects">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                <Badge variant="secondary" className={cn(stageColors[project.stage])}>
                  {project.stage.charAt(0).toUpperCase() + project.stage.slice(1)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
                {project.description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Project Stats */}
        <div className="flex flex-wrap items-center gap-6 py-4 border-y">
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

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as ProjectView)} className="w-full">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <GanttChart className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="dependencies" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Dependencies
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

          <TabsContent value="kanban" className="mt-6">
            <KanbanView tasks={project.tasks} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-6">
            <TimelineView tasks={project.tasks} milestones={project.milestones} />
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <ListView tasks={project.tasks} />
          </TabsContent>
          <TabsContent value="dependencies" className="mt-6">
            <DependencyView tasks={project.tasks} />
          </TabsContent>
          <TabsContent value="milestones" className="mt-6">
            <MilestonesView 
              milestones={project.milestones} 
              tasks={project.tasks} 
              issues={project.issues || []}
            />
          </TabsContent>
          <TabsContent value="issues" className="mt-6">
            <IssuesView issues={project.issues || []} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
