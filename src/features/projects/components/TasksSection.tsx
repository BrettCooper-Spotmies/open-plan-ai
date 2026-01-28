import { useState, useMemo } from 'react';
import { LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Task, TaskViewMode, TaskFilter, Milestone, Issue, ModuleType } from '@/types';
import { KanbanView } from './KanbanView';
import { ListView } from './ListView';
import { TaskFilters } from './TaskFilters';
import { TaskFiltersDropdown } from './TaskFiltersDropdown';
import { cn } from '@/lib/utils';

interface TasksSectionProps {
  tasks: Task[];
  milestones: Milestone[];
  issues: Issue[];
  modules: { id: string; name: string; type: ModuleType }[];
  viewMode?: TaskViewMode;
  onViewModeChange?: (mode: TaskViewMode) => void;
  isFiltersOpen?: boolean;
  onFiltersOpenChange?: (open: boolean) => void;
  filters?: TaskFilter;
  onFiltersChange?: (filters: TaskFilter) => void;
  onTaskCreate?: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTaskUpdate?: (task: Task) => void;
}

// Export ViewControls component for use in parent
export function ViewControls({ 
  viewMode, 
  onViewModeChange,
  filters,
  onFiltersChange,
  milestones,
  modules,
  teamMembers,
  allTags,
  activeFilterCount,
  onClearFilters
}: {
  viewMode: TaskViewMode;
  onViewModeChange: (mode: TaskViewMode) => void;
  filters: TaskFilter;
  onFiltersChange: (filters: TaskFilter) => void;
  milestones: Milestone[];
  modules: { id: string; name: string; type: ModuleType }[];
  teamMembers: { id: string; name: string; initials: string }[];
  allTags: string[];
  activeFilterCount: number;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* View Toggle */}
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => value && onViewModeChange(value as TaskViewMode)}
        className="bg-muted/50 p-1 rounded-lg"
      >
        <ToggleGroupItem value="kanban" aria-label="Kanban view" className="px-2 data-[state=on]:bg-background">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view" className="px-2 data-[state=on]:bg-background">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Filter Dropdown */}
      <TaskFiltersDropdown
        filters={filters}
        onFiltersChange={onFiltersChange}
        milestones={milestones}
        modules={modules}
        teamMembers={teamMembers}
        allTags={allTags}
        activeFilterCount={activeFilterCount}
      />

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}

export function TasksSection({ 
  tasks, 
  milestones, 
  issues, 
  modules,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  isFiltersOpen: externalIsFiltersOpen,
  onFiltersOpenChange: externalOnFiltersOpenChange,
  filters: externalFilters,
  onFiltersChange: externalOnFiltersChange,
  onTaskCreate,
  onTaskUpdate,
}: TasksSectionProps) {
  const [internalViewMode, setInternalViewMode] = useState<TaskViewMode>('kanban');
  const [internalFilters, setInternalFilters] = useState<TaskFilter>({});
  const [internalIsFiltersOpen, setInternalIsFiltersOpen] = useState(false);

  // Use external props if provided, otherwise use internal state
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = externalOnViewModeChange ?? setInternalViewMode;
  const filters = externalFilters ?? internalFilters;
  const setFilters = externalOnFiltersChange ?? setInternalFilters;
  const isFiltersOpen = externalIsFiltersOpen ?? internalIsFiltersOpen;
  const setIsFiltersOpen = externalOnFiltersOpenChange ?? setInternalIsFiltersOpen;

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

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (filters.status?.length && !filters.status.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority?.length && !filters.priority.includes(task.priority)) {
        return false;
      }

      // Module filter
      if (filters.module?.length && !filters.module.includes(task.module)) {
        return false;
      }

      // Assignee filter
      if (filters.assignee?.length) {
        if ((!task.assignees || task.assignees.length === 0) && !filters.assignee.includes('unassigned')) {
          return false;
        }
        if (task.assignees && task.assignees.length > 0) {
          const hasMatchingAssignee = task.assignees.some(a => filters.assignee!.includes(a.id));
          if (!hasMatchingAssignee) return false;
        }
      }

      // Milestone filter
      if (filters.milestoneId && task.milestoneId !== filters.milestoneId) {
        return false;
      }

      // Due date filter
      if (filters.dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;

        switch (filters.dueDate) {
          case 'overdue':
            if (!taskDueDate || taskDueDate >= today) return false;
            break;
          case 'today':
            if (!taskDueDate || taskDueDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'this-week': {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + 7);
            if (!taskDueDate || taskDueDate < today || taskDueDate > weekEnd) return false;
            break;
          }
          case 'this-month': {
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            if (!taskDueDate || taskDueDate < today || taskDueDate > monthEnd) return false;
            break;
          }
          case 'no-date':
            if (taskDueDate) return false;
            break;
        }
      }

      // Tags filter
      if (filters.tags?.length && !filters.tags.some(tag => task.tags.includes(tag))) {
        return false;
      }

      // Has blockers filter
      if (filters.hasBlockers !== undefined) {
        const hasBlockers = task.blockedBy.length > 0 || (task.linkedIssueIds?.length || 0) > 0;
        if (filters.hasBlockers !== hasBlockers) return false;
      }

      return true;
    });
  }, [tasks, filters]);

  const clearFilters = () => {
    setFilters({});
  };

  // Get unique team members from tasks
  const teamMembers = useMemo(() => {
    const members = new Map<string, { id: string; name: string; initials: string }>();
    tasks.forEach(task => {
      if (task.assignees) {
        task.assignees.forEach(assignee => {
          members.set(assignee.id, {
            id: assignee.id,
            name: assignee.name,
            initials: assignee.initials,
          });
        });
      }
    });
    return Array.from(members.values());
  }, [tasks]);

  // Get unique tags from tasks
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(task => {
      task.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 gap-4 w-full min-w-0">
      {/* Filters Panel */}
      {isFiltersOpen && (
        <TaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          milestones={milestones}
          modules={modules}
          teamMembers={teamMembers}
          allTags={allTags}
        />
      )}

      {/* View Content */}
      <div className="min-h-[400px] w-full min-w-0">
        {viewMode === 'kanban' ? (
          <KanbanView 
            tasks={filteredTasks} 
            allTasks={tasks} 
            issues={issues}
            onTaskCreate={onTaskCreate}
            onTaskUpdate={onTaskUpdate}
          />
        ) : (
          <ListView 
            tasks={filteredTasks} 
            milestones={milestones}
            onTaskClick={() => {}}
          />
        )}
      </div>
    </div>
  );
}
