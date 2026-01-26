import { useState, useMemo } from 'react';
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
import {
  ReportFilter,
  getDateRangeFromTimeRange,
  calculateKPIs,
  getTaskStatusBreakdown,
  getMilestoneHealth,
  getTeamWorkload,
  getModuleProgress,
  getCompletedTasksTrend,
  applyFilters,
} from './utils/reportsUtils';
import { projects, teamMembers, projectModules, projectIssues } from '@/data/mockData';
import { Task, Issue, Milestone } from '@/types';

export default function Reports() {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<ReportFilter>({
    timeRange: '30d',
  });

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

  // Calculate KPIs
  const kpis = useMemo(() => {
    return calculateKPIs(filteredTasks, issues, dateRange);
  }, [filteredTasks, issues, dateRange]);

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

  // Handlers
  const handleKPIClick = (type: 'progress' | 'issues' | 'overdue' | 'cycle') => {
    // For MVP, navigate to project detail with appropriate section
    if (filter.projectId) {
      navigate(`/projects/${filter.projectId}`);
    }
  };

  const handleStatusClick = (status: string) => {
    setFilter({ ...filter, status: [status as any] });
  };

  const handleMilestoneClick = (milestoneId: string) => {
    // Navigate to milestone detail
    if (filter.projectId) {
      navigate(`/projects/${filter.projectId}`);
    }
  };

  const handleMemberClick = (memberId: string) => {
    setFilter({ ...filter, assigneeIds: [memberId] });
  };

  const handleModuleClick = (moduleId: string) => {
    setFilter({ ...filter, moduleIds: [moduleId] });
  };

  const handleIssueClick = (issueId: string) => {
    // Find the project containing this issue
    const projectWithIssue = projects.find(p =>
      p.issues?.some(i => i.id === issueId)
    );
    if (projectWithIssue) {
      navigate(`/projects/${projectWithIssue.id}/issues/${issueId}`);
    }
  };

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

        <ReportsKPIRow
          kpis={kpis}
          onKPIClick={handleKPIClick}
        />

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
