import { useState } from 'react';
import { DashboardStats } from './components/DashboardStats';
import { ActivityFeed } from './components/ActivityFeed';
import { ProjectsOverview } from './components/ProjectsOverview';
import { UpcomingMilestones } from './components/UpcomingMilestones';
import { useDashboardStats, useRecentActivity, useUpcomingDashboardMilestones, useProjectSummaries } from '@/hooks/useDashboard';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { Activity, Milestone, Project } from '@/types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Loader2, Plus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { teamService } from '@/services/team.service';

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { currentOrganization, isLoading: orgLoading, createOrganization, refreshOrganizations } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({ name: '', description: '' });

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity(4);
  const { data: milestones, isLoading: milestonesLoading } = useUpcomingDashboardMilestones(4);
  const { data: projectSummaries, isLoading: projectsLoading } = useProjectSummaries();

  const isLoading = statsLoading || activitiesLoading || milestonesLoading || projectsLoading;

  const handleCreateOrg = async () => {
    if (!newOrgForm.name.trim()) {
      toast.error('Organization name is required');
      return;
    }
    setIsCreating(true);
    try {
      await createOrganization(newOrgForm.name, newOrgForm.description);
      toast.success('Organization created successfully');
      setNewOrgForm({ name: '', description: '' });
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch pending invitations for current user — via service layer, not inline Supabase.
  const { data: pendingInvitations } = useQuery({
    queryKey: ['pending-invitations', user?.email],
    queryFn: () => teamService.getPendingInvitationsForUser(user!.email!),
    enabled: !!user?.email,
  });

  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);

  const handleAcceptInvite = async (invitation: { id: string; token?: string | null }) => {
    setAcceptingInvite(invitation.id);
    try {
      await teamService.acceptInvitation(invitation.id || invitation.token || '');
      toast.success('Successfully joined the organization!');
      await refreshOrganizations();
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation');
    } finally {
      setAcceptingInvite(null);
    }
  };

  // Transform data for DashboardStats component
  const dashboardStats = stats ? {
    totalProjects: stats.activeProjects,
    activeProjects: stats.activeProjects,
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
    inProgressTasks: stats.inProgressTasks,
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
  const activityItems: Activity[] = (activities || []).map((activity: any) => {
    const userName: string = activity.profiles?.name || 'Team Member';
    const initials: string = userName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'TM';
    return {
      id: activity.id,
      type: activity.activity_type,
      title: activity.description.split(' ').slice(0, 3).join(' '),
      description: activity.description,
      user: {
        id: activity.user_id || 'unknown',
        name: userName,
        email: activity.profiles?.email || '',
        role: '',
        initials,
      },
      projectId: activity.project_id,
      projectName: activity.projects?.name || '',
      timestamp: activity.created_at || new Date().toISOString(),
    };
  });

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

  const dashboardProjects = isMobile ? projectItems.slice(0, 3) : projectItems;
  const dashboardMilestones = isMobile ? milestoneItems.slice(0, 3) : milestoneItems;
  const dashboardActivities = isMobile ? activityItems.slice(0, 4) : activityItems;

  // Show "Create Organization" card when no org exists
  const showNoOrgState = !orgLoading && !currentOrganization;

  return (
    <>
      <div className="space-y-4 md:space-y-6 animate-fade-in overflow-x-hidden">
        {!isMobile && (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome back! Here's an overview of your projects.
            </p>
          </div>
        )}

        {/* Compact Create Organization Banner */}
        {showNoOrgState && (
          <Card className="border-dashed border border-primary/25 bg-primary/[0.03]">
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 px-4 sm:px-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Create Your Organization</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set up an organization to manage projects and collaborate with your team.
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5 shrink-0 w-full sm:w-auto">
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations Banner */}
        {pendingInvitations && pendingInvitations.length > 0 && pendingInvitations.map((inv: any) => (
          <Card key={inv.id} className="border-dashed border border-primary/25 bg-primary/[0.03]">
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 px-4 sm:px-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  Pending Invitation: {inv.organizations?.name || 'Organization'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You've been invited as a <strong>{inv.role}</strong>. Click Join to accept.
                </p>
              </div>
              <Button
                onClick={() => handleAcceptInvite({ id: inv.id, token: inv.token })}
                size="sm"
                className="gap-1.5 shrink-0 w-full sm:w-auto"
                disabled={acceptingInvite === inv.id}
              >
                {acceptingInvite === inv.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Building2 className="h-3.5 w-3.5" />
                )}
                Join
              </Button>
            </CardContent>
          </Card>
        ))}

        {isLoading ? (
          <AppLayoutSkeleton variant="dashboard" />
        ) : (
          <>
            <DashboardStats stats={dashboardStats} />

            <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 h-full">
                <ProjectsOverview projects={dashboardProjects} />
              </div>
              <div className="space-y-4 md:space-y-6">
                <UpcomingMilestones milestones={dashboardMilestones} />
                <ActivityFeed activities={dashboardActivities} isLoading={activitiesLoading || isLoading} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a new organization to manage your projects and team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dashboard-org-name">Organization Name *</Label>
              <Input
                id="dashboard-org-name"
                value={newOrgForm.name}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                placeholder="e.g. My Company"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard-org-desc">Description (optional)</Label>
              <Textarea
                id="dashboard-org-desc"
                value={newOrgForm.description}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, description: e.target.value })}
                placeholder="Brief description of your organization"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrg} disabled={isCreating || !newOrgForm.name.trim()}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
