import { useState, useMemo } from 'react';
import { LayoutGrid, List, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Task, TaskViewMode, TaskFilter, Milestone, Issue, ModuleType, TaskStatus } from '@/types';
import { KanbanView } from './KanbanView';
import { ListView } from './ListView';
import { TaskFilters } from './TaskFilters';
import { cn } from '@/lib/utils';

interface TasksSectionProps {
  tasks: Task[];
  milestones: Milestone[];
  issues: Issue[];
  modules: { id: string; name: string; type: ModuleType }[];
}

export function TasksSection({ tasks, milestones, issues, modules }: TasksSectionProps) {
  const [viewMode, setViewMode] = useState<TaskViewMode>('kanban');
  const [filters, setFilters] = useState<TaskFilter>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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
        if (!task.assignee && !filters.assignee.includes('unassigned')) {
          return false;
        }
        if (task.assignee && !filters.assignee.includes(task.assignee.id)) {
          return false;
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
      if (task.assignee) {
        members.set(task.assignee.id, {
          id: task.assignee.id,
          name: task.assignee.name,
          initials: task.assignee.initials,
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as TaskViewMode)}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="gap-1.5 px-3 data-[state=on]:bg-background">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-3 data-[state=on]:bg-background">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Filter Button */}
          <Button
            variant={isFiltersOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Task count */}
        <div className="text-sm text-muted-foreground">
          {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

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
      <div className="min-h-[400px]">
        {viewMode === 'kanban' ? (
          <KanbanView tasks={filteredTasks} allTasks={tasks} issues={issues} />
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
