import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from './components/DashboardStats';
import { ActivityFeed } from './components/ActivityFeed';
import { ProjectsOverview } from './components/ProjectsOverview';
import { UpcomingMilestones } from './components/UpcomingMilestones';
import { useDashboardStats, useRecentActivity, useUpcomingDashboardMilestones, useProjectSummaries } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Milestone, Project } from '@/types';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity(4);
  const { data: milestones, isLoading: milestonesLoading } = useUpcomingDashboardMilestones(4);
  const { data: projectSummaries, isLoading: projectsLoading } = useProjectSummaries();

  const isLoading = statsLoading || activitiesLoading || milestonesLoading || projectsLoading;

  // Transform data for DashboardStats component
  const dashboardStats = stats ? {
    totalProjects: stats.activeProjects,
    activeProjects: stats.activeProjects,
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
    inProgressTasks: Math.max(0, stats.totalTasks - stats.completedTasks - stats.overdueItems),
    blockedTasks: stats.overdueItems,
  } : {
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
  };

  // Transform activities for ActivityFeed (Activity type)
  const activityItems: Activity[] = (activities || []).map(activity => ({
    id: activity.id,
    type: activity.activity_type,
    title: activity.description.split(' ').slice(0, 3).join(' '),
    description: activity.description,
    user: {
      id: activity.user_id || 'unknown',
      name: 'Team Member',
      email: '',
      role: '',
      initials: 'TM'
    },
    projectId: activity.project_id,
    projectName: '', // Would need to join with projects
    timestamp: activity.created_at || new Date().toISOString(),
  }));

  // Transform milestones for UpcomingMilestones (Milestone type)
  const milestoneItems: (Milestone & { projectName?: string })[] = (milestones || []).map(m => ({
    id: m.id,
    title: m.name,
    description: m.description || undefined,
    date: m.due_date || new Date().toISOString(),
    completed: m.status === 'completed',
    projectName: '', // Would need to join with projects
  }));

  // Transform project summaries for ProjectsOverview (Project type)
  const projectItems: Project[] = (projectSummaries || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    progress: p.progress || 0,
    stage: p.stage as 'concept' | 'design' | 'development' | 'testing' | 'production',
    tasks: [],
    milestones: [],
    team: [],
    modules: [],
    issues: [],
    projectModules: [],
    startDate: '',
    targetDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back! Here's an overview of your projects.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="lg:col-span-2 h-[400px]" />
              <div className="space-y-6">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <DashboardStats stats={dashboardStats} />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 h-full">
                <ProjectsOverview projects={projectItems} />
              </div>
              <div className="space-y-6">
                <UpcomingMilestones milestones={milestoneItems} />
                <ActivityFeed activities={activityItems} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
