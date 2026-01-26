// Reports feature barrel export
export { default } from './Reports';

// Re-export components for use elsewhere if needed
export { ReportsHeader } from './components/ReportsHeader';
export { ReportsFilters } from './components/ReportsFilters';
export { ReportsKPIRow } from './components/ReportsKPIRow';
export { ReportTaskStatusChart } from './components/ReportTaskStatusChart';
export { ReportMilestoneHealth } from './components/ReportMilestoneHealth';
export { ReportTeamWorkload } from './components/ReportTeamWorkload';
export { ReportModuleProgress } from './components/ReportModuleProgress';
export { ReportOpenIssuesTable } from './components/ReportOpenIssuesTable';
export { ReportTrendChart } from './components/ReportTrendChart';

// Re-export utilities
export * from './utils/reportsUtils';
