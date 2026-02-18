import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadCSVReport, triggerPDFExport } from './utils/exportUtils';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReportsHeader } from './components/ReportsHeader';
import { ReportsFilters } from './components/ReportsFilters';
import { ReportsKPIRow } from './components/ReportsKPIRow';
import { ReportTaskStatusChart } from './components/ReportTaskStatusChart';
import { ReportMilestoneHealth } from './components/ReportMilestoneHealth';
import { ReportTeamWorkload } from './components/ReportTeamWorkload';
import { ReportModuleProgress } from './components/ReportModuleProgress';
import { ReportOpenIssuesTable } from './components/ReportOpenIssuesTable';
import { ReportTrendChart } from './components/ReportTrendChart';
import { useReportWorker } from '@/hooks/useReportWorker';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';
import { useAllIssues } from '@/hooks/useIssues';
import { useAllMilestones } from '@/hooks/useMilestones';
import { useOrgAllModules } from '@/hooks/useModules';
import { useTeamMembers } from '@/hooks/useTeam';
import { useOrganization } from '@/contexts/OrganizationContext';
import { TeamMember as ServiceTeamMember } from '@/services/team.service';
import { Module as DbModule } from '@/services/modules.service';
import { Milestone as DbMilestone } from '@/services/milestones.service';
import {
  ReportFilter,
  ReportKPI,
  getDateRangeFromTimeRange,
  getTaskStatusBreakdown,
  getMilestoneHealth,
  getTeamWorkload,
  getModuleProgress,
  getCompletedTasksTrend,
  applyFilters,
  filterTasksByTimeRange,
} from './utils/reportsUtils';
import { TeamMember, Module, Milestone, ModuleType } from '@/types';

// Default KPIs for loading state
const defaultKPIs: ReportKPI = {
  projectProgress: 0,
  completedTasks: 0,
  totalTasks: 0,
  openIssues: 0,
  criticalIssues: 0,
  overdueTasks: 0,
  avgCycleTime: 0,
  trendData: [],
};

// ─── Type Adapters ────────────────────────────────────────────────────────────

function dbMilestoneToFrontend(dbM: DbMilestone): Milestone {
  return {
    id: dbM.id,
    title: dbM.name,
    date: dbM.due_date || '',
    completed: dbM.status === 'completed',
    description: dbM.description || undefined,
  };
}

function dbModuleToFrontend(dbM: DbModule): Module {
  return {
    id: dbM.id,
    name: dbM.name,
    type: (dbM.module_type as ModuleType) || 'software',
    description: dbM.description || undefined,
    createdAt: dbM.created_at || '',
  };
}

function serviceTeamMemberToFrontend(m: ServiceTeamMember): TeamMember {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    initials: m.initials,
    avatar: m.avatar_url || undefined,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Reports() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const { calculateKPIs, isCalculating } = useReportWorker();

  const [filter, setFilter] = useState<ReportFilter>({ timeRange: '30d' });
  const [kpis, setKpis] = useState<ReportKPI>(defaultKPIs);

  // ─── Real data hooks ─────────────────────────────────────────────────────
  const { data: allProjects = [], isLoading: projectsLoading } = useProjects();
  const { data: allTasks = [], isLoading: tasksLoading } = useAllTasks();
  const { data: allIssues = [], isLoading: issuesLoading } = useAllIssues();
  const { data: dbMilestones = [], isLoading: milestonesLoading } = useAllMilestones();
  const { data: dbModules = [], isLoading: modulesLoading } = useOrgAllModules();
  const { data: serviceTeamMembers = [], isLoading: teamLoading } = useTeamMembers(orgId);

  const isLoading = projectsLoading || tasksLoading || issuesLoading || milestonesLoading || modulesLoading || teamLoading;

  // ─── Adapted frontend types ───────────────────────────────────────────────
  const allAdaptedMilestones = useMemo(
    () => dbMilestones.map(dbMilestoneToFrontend),
    [dbMilestones]
  );

  const allAdaptedModules = useMemo(
    () => dbModules.map(dbModuleToFrontend),
    [dbModules]
  );

  const allAdaptedTeamMembers = useMemo(
    () => serviceTeamMembers.map(serviceTeamMemberToFrontend),
    [serviceTeamMembers]
  );

  // ─── Project-scoped data ─────────────────────────────────────────────────
  const tasks = useMemo(() => {
    if (!filter.projectId) return allTasks;
    return allTasks.filter(t => t.projectId === filter.projectId);
  }, [allTasks, filter.projectId]);

  const issues = useMemo(() => {
    if (!filter.projectId) return allIssues;
    return allIssues.filter(i => i.projectId === filter.projectId);
  }, [allIssues, filter.projectId]);

  const milestones = useMemo(() => {
    if (!filter.projectId) return allAdaptedMilestones;
    const filtered = dbMilestones.filter(m => m.project_id === filter.projectId);
    return filtered.map(dbMilestoneToFrontend);
  }, [dbMilestones, allAdaptedMilestones, filter.projectId]);

  const modules = useMemo(() => {
    if (!filter.projectId) return allAdaptedModules;
    const filtered = dbModules.filter(m => m.project_id === filter.projectId);
    return filtered.map(dbModuleToFrontend);
  }, [dbModules, allAdaptedModules, filter.projectId]);

  // ─── Project name for header ──────────────────────────────────────────────
  const projectName = useMemo(() => {
    if (!filter.projectId) return undefined;
    return allProjects.find(p => p.id === filter.projectId)?.name;
  }, [allProjects, filter.projectId]);

  // ─── Date range ───────────────────────────────────────────────────────────
  const dateRange = useMemo(
    () => getDateRangeFromTimeRange(filter.timeRange, filter.customDateRange),
    [filter.timeRange, filter.customDateRange]
  );

  // ─── Apply task filters (time range first, then other filters) ───────────
  const filteredTasks = useMemo(() => {
    const timeFiltered = filterTasksByTimeRange(tasks, dateRange);
    return applyFilters(timeFiltered, filter);
  }, [tasks, filter, dateRange]);

  // ─── KPIs via worker ─────────────────────────────────────────────────────
  useEffect(() => {
    calculateKPIs(filteredTasks, issues).then(setKpis);
  }, [filteredTasks, issues, calculateKPIs]);

  // ─── Chart data ───────────────────────────────────────────────────────────
  const statusBreakdown = useMemo(() => getTaskStatusBreakdown(filteredTasks), [filteredTasks]);
  const milestoneHealth = useMemo(() => getMilestoneHealth(milestones, filteredTasks), [milestones, filteredTasks]);
  const teamWorkload = useMemo(() => getTeamWorkload(filteredTasks, allAdaptedTeamMembers), [filteredTasks, allAdaptedTeamMembers]);
  const moduleProgress = useMemo(() => getModuleProgress(filteredTasks, modules), [filteredTasks, modules]);
  const trendData = useMemo(() => getCompletedTasksTrend(filteredTasks, dateRange), [filteredTasks, dateRange]);

  // ─── Time range label ─────────────────────────────────────────────────────
  const timeRangeLabel = useMemo(() => {
    switch (filter.timeRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case 'custom': return 'Custom range';
      default: return '';
    }
  }, [filter.timeRange]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleKPIClick = useCallback((_type: 'progress' | 'issues' | 'overdue' | 'cycle') => {
    if (filter.projectId) navigate(`/projects/${filter.projectId}`);
  }, [filter.projectId, navigate]);

  const handleStatusClick = useCallback((status: string) => {
    setFilter(prev => ({ ...prev, status: [status as any] }));
  }, []);

  const handleMilestoneClick = useCallback((milestoneId: string) => {
    const dbM = dbMilestones.find(m => m.id === milestoneId);
    if (dbM?.project_id) navigate(`/projects/${dbM.project_id}`);
    else if (filter.projectId) navigate(`/projects/${filter.projectId}`);
  }, [dbMilestones, filter.projectId, navigate]);

  const handleMemberClick = useCallback((memberId: string) => {
    setFilter(prev => ({ ...prev, assigneeIds: [memberId] }));
  }, []);

  const handleModuleClick = useCallback((moduleId: string) => {
    setFilter(prev => ({ ...prev, moduleIds: [moduleId] }));
  }, []);

  const handleIssueClick = useCallback((issueId: string) => {
    const issue = allIssues.find(i => i.id === issueId);
    if (issue?.projectId) navigate(`/projects/${issue.projectId}/issues/${issueId}`);
  }, [allIssues, navigate]);

  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      downloadCSVReport({
        kpis,
        statusBreakdown,
        milestoneHealth,
        teamWorkload,
        moduleProgress,
        trendData,
        issues,
        projectName,
        timeRangeLabel,
      });
    } else {
      triggerPDFExport();
    }
  }, [kpis, statusBreakdown, milestoneHealth, teamWorkload, moduleProgress, trendData, issues, projectName, timeRangeLabel]);

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <ReportsHeader
          projectName={projectName}
          timeRangeLabel={timeRangeLabel}
          onExport={handleExport}
        />

        <ReportsFilters
          projects={allProjects}
          teamMembers={allAdaptedTeamMembers}
          modules={modules}
          milestones={milestones}
          filter={filter}
          onFilterChange={setFilter}
        />

        {isCalculating ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <ReportsKPIRow kpis={kpis} onKPIClick={handleKPIClick} />
        )}

        {/* 2-Column Grid for Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportTaskStatusChart
            data={statusBreakdown}
            onStatusClick={handleStatusClick}
          />
          <ReportMilestoneHealth
            data={milestoneHealth}
            onMilestoneClick={handleMilestoneClick}
          />
          <ReportTeamWorkload
            data={teamWorkload}
            onMemberClick={handleMemberClick}
          />
          <ReportModuleProgress
            data={moduleProgress}
            onModuleClick={handleModuleClick}
          />
        </div>

        {/* Full Width: Trend Chart */}
        <ReportTrendChart data={trendData} />

        {/* Full Width: Open Issues Table */}
        <ReportOpenIssuesTable
          issues={issues}
          onIssueClick={handleIssueClick}
        />
      </div>
    </AppLayout>
  );
}
