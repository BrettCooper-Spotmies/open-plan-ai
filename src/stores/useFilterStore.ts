import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TaskStatus, Priority, ModuleType } from '@/types';

export type ReportTimeRange = '7d' | '30d' | '90d' | 'custom';

export interface ReportFilter {
  projectId?: string;
  timeRange: ReportTimeRange;
  customDateRange?: { start: string; end: string };
  moduleIds?: string[];
  milestoneIds?: string[];
  assigneeIds?: string[];
  priority?: Priority[];
  status?: TaskStatus[];
  tags?: string[];
}

export interface TaskFilterState {
  status?: TaskStatus[];
  priority?: Priority[];
  module?: ModuleType[];
  assigneeIds?: string[];
  milestoneId?: string;
  dueDate?: 'overdue' | 'today' | 'this-week' | 'this-month' | 'no-date';
  tags?: string[];
  hasBlockers?: boolean;
}

interface FilterState {
  // Report filters
  reportFilters: ReportFilter;
  setReportFilters: (filters: Partial<ReportFilter>) => void;
  resetReportFilters: () => void;
  
  // Task filters (for project views)
  taskFilters: TaskFilterState;
  setTaskFilters: (filters: Partial<TaskFilterState>) => void;
  resetTaskFilters: () => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // View preferences per project
  projectViewPreferences: Record<string, {
    section: 'tasks' | 'modules' | 'milestones' | 'issues';
    taskViewMode: 'kanban' | 'list';
    moduleViewMode: 'kanban' | 'list';
  }>;
  setProjectViewPreference: (projectId: string, preference: Partial<{
    section: 'tasks' | 'modules' | 'milestones' | 'issues';
    taskViewMode: 'kanban' | 'list';
    moduleViewMode: 'kanban' | 'list';
  }>) => void;
}

const defaultReportFilters: ReportFilter = {
  timeRange: '30d',
};

const defaultTaskFilters: TaskFilterState = {};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      // Report filters
      reportFilters: defaultReportFilters,
      setReportFilters: (filters) => set((state) => ({
        reportFilters: { ...state.reportFilters, ...filters }
      })),
      resetReportFilters: () => set({ reportFilters: defaultReportFilters }),
      
      // Task filters
      taskFilters: defaultTaskFilters,
      setTaskFilters: (filters) => set((state) => ({
        taskFilters: { ...state.taskFilters, ...filters }
      })),
      resetTaskFilters: () => set({ taskFilters: defaultTaskFilters }),
      
      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      // View preferences
      projectViewPreferences: {},
      setProjectViewPreference: (projectId, preference) => set((state) => ({
        projectViewPreferences: {
          ...state.projectViewPreferences,
          [projectId]: {
            section: 'tasks',
            taskViewMode: 'kanban',
            moduleViewMode: 'kanban',
            ...state.projectViewPreferences[projectId],
            ...preference,
          },
        },
      })),
    }),
    { name: 'filter-store' }
  )
);
