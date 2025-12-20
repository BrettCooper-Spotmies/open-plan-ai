import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ProjectsOverview } from '@/components/dashboard/ProjectsOverview';
import { UpcomingMilestones } from '@/components/dashboard/UpcomingMilestones';
import { projects, recentActivity, dashboardStats } from '@/data/mockData';

export default function Dashboard() {
  const upcomingMilestones = projects
    .flatMap(p => p.milestones.filter(m => !m.completed).map(m => ({ ...m, projectName: p.name })))
    .slice(0, 4);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back! Here's an overview of your projects.
          </p>
        </div>

        <DashboardStats stats={dashboardStats} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProjectsOverview projects={projects} />
          </div>
          <div className="space-y-6">
            <UpcomingMilestones milestones={upcomingMilestones} />
            <ActivityFeed activities={recentActivity.slice(0, 4)} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
