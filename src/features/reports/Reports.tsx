import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  ReportFilter,
  ReportKPI,
  getDateRangeFromTimeRange,
  calculateKPIs as calculateKPIsSync,
  getTaskStatusBreakdown,
  getMilestoneHealth,
  getTeamWorkload,
  getModuleProgress,
  getCompletedTasksTrend,
  applyFilters,
} from './utils/reportsUtils';
import { projects, teamMembers, projectModules, projectIssues } from '@/data/mockData';
import { Task, Issue, Milestone } from '@/types';

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

export default function Reports() {
  const navigate = useNavigate();
  const { calculateKPIs, isCalculating } = useReportWorker();

  const [filter, setFilter] = useState<ReportFilter>({
    timeRange: '30d',
  });
  
  const [kpis, setKpis] = useState<ReportKPI>(defaultKPIs);

  // Aggregate data from all projects or selected project
  const { tasks, issues, milestones, projectName } = useMemo(() => {
    let allTasks: Task[] = [];
    let allIssues: Issue[] = [];
    let allMilestones: Milestone[] = [];
    let name: string | undefined;

    if (filter.projectId) {
      const project = projects.find(p => p.id === filter.projectId);
      if (project) {
        allTasks = project.tasks;
        allIssues = project.issues || [];
        allMilestones = project.milestones;
        name = project.name;
      }
    } else {
      projects.forEach(project => {
        allTasks = [...allTasks, ...project.tasks];
        allIssues = [...allIssues, ...(project.issues || [])];
        allMilestones = [...allMilestones, ...project.milestones];
      });
      // Add standalone issues
      allIssues = [...allIssues, ...projectIssues];
    }

    return {
      tasks: allTasks,
      issues: allIssues,
      milestones: allMilestones,
      projectName: name
    };
  }, [filter.projectId]);

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return applyFilters(tasks, filter);
  }, [tasks, filter]);

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeFromTimeRange(filter.timeRange, filter.customDateRange);
  }, [filter.timeRange, filter.customDateRange]);

  // Calculate KPIs using Web Worker for heavy calculations
  useEffect(() => {
    calculateKPIs(filteredTasks, issues).then((result) => {
      setKpis(result);
    });
  }, [filteredTasks, issues, calculateKPIs]);

  // Get chart data
  const statusBreakdown = useMemo(() => {
    return getTaskStatusBreakdown(filteredTasks);
  }, [filteredTasks]);

  const milestoneHealth = useMemo(() => {
    return getMilestoneHealth(milestones, filteredTasks);
  }, [milestones, filteredTasks]);

  const teamWorkload = useMemo(() => {
    return getTeamWorkload(filteredTasks, teamMembers);
  }, [filteredTasks]);

  const moduleProgress = useMemo(() => {
    return getModuleProgress(filteredTasks, projectModules);
  }, [filteredTasks]);

  const trendData = useMemo(() => {
    return getCompletedTasksTrend(filteredTasks, dateRange);
  }, [filteredTasks, dateRange]);

  // Get time range label
  const timeRangeLabel = useMemo(() => {
    switch (filter.timeRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case 'custom': return 'Custom range';
      default: return '';
    }
  }, [filter.timeRange]);

  // Handlers with useCallback to prevent unnecessary re-renders
  const handleKPIClick = useCallback((type: 'progress' | 'issues' | 'overdue' | 'cycle') => {
    if (filter.projectId) {
      navigate(`/projects/${filter.projectId}`);
    }
  }, [filter.projectId, navigate]);

  const handleStatusClick = useCallback((status: string) => {
    setFilter(prev => ({ ...prev, status: [status as 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'] }));
  }, []);

  const handleMilestoneClick = useCallback((milestoneId: string) => {
    if (filter.projectId) {
      navigate(`/projects/${filter.projectId}`);
    }
  }, [filter.projectId, navigate]);

  const handleMemberClick = useCallback((memberId: string) => {
    setFilter(prev => ({ ...prev, assigneeIds: [memberId] }));
  }, []);

  const handleModuleClick = useCallback((moduleId: string) => {
    setFilter(prev => ({ ...prev, moduleIds: [moduleId] }));
  }, []);

  const handleIssueClick = useCallback((issueId: string) => {
    const projectWithIssue = projects.find(p =>
      p.issues?.some(i => i.id === issueId)
    );
    if (projectWithIssue) {
      navigate(`/projects/${projectWithIssue.id}/issues/${issueId}`);
    }
  }, [navigate]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <ReportsHeader
          projectName={projectName}
          timeRangeLabel={timeRangeLabel}
        />

        <ReportsFilters
          projects={projects}
          teamMembers={teamMembers}
          modules={projectModules}
          milestones={milestones}
          filter={filter}
          onFilterChange={setFilter}
        />

        {isCalculating ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <ReportsKPIRow
            kpis={kpis}
            onKPIClick={handleKPIClick}
          />
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
          {/* Module Progress Chart - Always rendered to show empty state when needed */}
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
