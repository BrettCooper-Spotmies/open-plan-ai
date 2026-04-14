import { useState, useMemo } from 'react';
import { LayoutGrid, List, X, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Task, TaskViewMode, TaskFilter, Milestone, Issue, ModuleType, TeamMember } from '@/types';
import { KanbanView } from './KanbanView';
import { ListView } from './ListView';
import { TaskFilters } from './TaskFilters';
import { TaskFiltersDropdown } from './TaskFiltersDropdown';
import { cn } from '@/lib/utils';

interface TasksSectionProps {
  projectId: string;
  tasks: Task[];
  allTasks?: Task[];
  milestones: Milestone[];
  issues: Issue[];
  modules: { id: string; name: string; type: ModuleType }[];
  assignableMembers?: TeamMember[];
  viewMode?: TaskViewMode;
  onViewModeChange?: (mode: TaskViewMode) => void;
  isFiltersOpen?: boolean;
  onFiltersOpenChange?: (open: boolean) => void;
  filters?: TaskFilter;
  onFiltersChange?: (filters: TaskFilter) => void;
  onTaskCreate?: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTaskUpdate?: (task: Task, onError?: () => void) => void;
  onBatchTaskUpdate?: (updates: Array<{ id: string; updates: Partial<Task> }>) => void;
  onTaskDelete?: (taskId: string) => void;
  onAddModule?: () => void;
}

// Export ViewControls component for use in parent
export function ViewControls({
  viewMode,
  onViewModeChange,
  onTaskCreate,
  searchQuery,
  onSearchQueryChange,
}: {
  viewMode: TaskViewMode;
  onViewModeChange: (mode: TaskViewMode) => void;
  onTaskCreate?: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-end shrink-0">
      {/* View Toggle */}
      <div className="flex items-center gap-0.5 bg-muted/50 p-1 rounded-lg shrink-0">
        <Button
          variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('kanban')}
          className={cn(
            "h-8 w-8 p-0",
            viewMode === 'kanban' && "bg-background shadow-sm"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className={cn(
            "h-8 w-8 p-0",
            viewMode === 'list' && "bg-background shadow-sm"
          )}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center flex-1 md:flex-none min-w-0 max-w-none sm:max-w-[240px]">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery || ''}
          onChange={(e) => onSearchQueryChange?.(e.target.value)}
          className="pl-9 w-full md:w-[200px] h-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-lg"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (onSearchQueryChange) onSearchQueryChange('');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Create Task Button */}
      {onTaskCreate && (
        <Button 
          size="sm" 
          onClick={onTaskCreate} 
          className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground h-9 ml-1 sm:ml-2 px-0 w-9 sm:w-auto sm:px-3 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Task</span>
        </Button>
      )}
    </div>
  );
}

export function TasksSection({
  projectId,
  tasks,
  allTasks,
  milestones,
  issues,
  modules,
  assignableMembers,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  isFiltersOpen: externalIsFiltersOpen,
  onFiltersOpenChange: externalOnFiltersOpenChange,
  filters: externalFilters,
  onFiltersChange: externalOnFiltersChange,
  onTaskCreate,
  onTaskUpdate,
  onBatchTaskUpdate,
  onTaskDelete,
  onAddModule,
}: TasksSectionProps) {
  const dependencyTasks = allTasks ?? tasks;

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
    if (filters.moduleIds?.length || filters.module?.length) count++;
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

      // Module filter by module IDs (dynamic project modules)
      if (filters.moduleIds?.length) {
        const assignedModuleIds = new Set<string>(task.moduleIds || []);

        // Backward compatibility for older tasks that only store module type
        if (assignedModuleIds.size === 0 && task.module) {
          modules.forEach(module => {
            if (module.type === task.module) assignedModuleIds.add(module.id);
          });
        }

        const hasMatch = filters.moduleIds.some(filterId => assignedModuleIds.has(filterId));
        if (!hasMatch) return false;
      }

      // Legacy module-type filter fallback
      if (filters.module?.length) {
        // Collect all types of assigned modules
        const assignedModuleTypes = new Set<string>();

        // Add the primary module type for backward compatibility
        if (task.module) assignedModuleTypes.add(task.module);

        // Add types from all assigned module IDs
        if (task.moduleIds && task.moduleIds.length > 0) {
          task.moduleIds.forEach(id => {
            const m = modules.find(mod => mod.id === id);
            if (m) assignedModuleTypes.add(m.type);
          });
        }

        // Check if there's any intersection between filter and assigned types
        const hasMatch = filters.module.some(filterType => assignedModuleTypes.has(filterType));
        if (!hasMatch) return false;
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
            projectId={projectId}
            tasks={filteredTasks}
            allTasks={dependencyTasks}
            issues={issues}
            assignableMembers={assignableMembers}
            onTaskCreate={onTaskCreate}
            onTaskUpdate={onTaskUpdate}
            onBatchTaskUpdate={onBatchTaskUpdate}
            onTaskDelete={onTaskDelete}
            modules={modules}
            onAddModule={onAddModule}
          />
        ) : (
          <ListView
            projectId={projectId}
            tasks={filteredTasks}
            allTasks={dependencyTasks}
            milestones={milestones}
            modules={modules}
            assignableMembers={assignableMembers}
            onTaskCreate={onTaskCreate}
            onTaskUpdate={onTaskUpdate}
            onBatchTaskUpdate={onBatchTaskUpdate}
            onTaskDelete={onTaskDelete}
            onAddModule={onAddModule}
          />
        )}
      </div>
    </div>
  );
}
