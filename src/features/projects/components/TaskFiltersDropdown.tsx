import { TaskFilter, Milestone, ModuleType, TaskStatus, Priority } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Filter, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskFiltersDropdownProps {
  filters: TaskFilter;
  onFiltersChange: (filters: TaskFilter) => void;
  milestones: Milestone[];
  modules: { id: string; name: string; type: ModuleType }[];
  teamMembers: { id: string; name: string; initials: string }[];
  allTags: string[];
  activeFilterCount: number;
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'bg-status-todo' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-status-in-progress' },
  { value: 'review', label: 'Review', color: 'bg-status-review' },
  { value: 'done', label: 'Done', color: 'bg-status-done' },
  { value: 'blocked', label: 'Blocked', color: 'bg-status-blocked' },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-priority-critical' },
  { value: 'high', label: 'High', color: 'bg-priority-high' },
  { value: 'medium', label: 'Medium', color: 'bg-priority-medium' },
  { value: 'low', label: 'Low', color: 'bg-priority-low' },
];

const dueDateOptions = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'no-date', label: 'No Date' },
];

export function TaskFiltersDropdown({
  filters,
  onFiltersChange,
  milestones,
  modules,
  teamMembers,
  allTags,
  activeFilterCount,
}: TaskFiltersDropdownProps) {
  const toggleStatus = (status: TaskStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, status: updated.length ? updated : undefined });
  };

  const togglePriority = (priority: Priority) => {
    const current = filters.priority || [];
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onFiltersChange({ ...filters, priority: updated.length ? updated : undefined });
  };

  const toggleModule = (moduleId: string) => {
    const current = filters.moduleIds || [];
    const updated = current.includes(moduleId)
      ? current.filter(id => id !== moduleId)
      : [...current, moduleId];
    onFiltersChange({ ...filters, moduleIds: updated.length ? updated : undefined });
  };

  const toggleAssignee = (assigneeId: string) => {
    const current = filters.assignee || [];
    const updated = current.includes(assigneeId)
      ? current.filter(a => a !== assigneeId)
      : [...current, assigneeId];
    onFiltersChange({ ...filters, assignee: updated.length ? updated : undefined });
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags || [];
    const updated = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    onFiltersChange({ ...filters, tags: updated.length ? updated : undefined });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter Tasks</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Status Filter */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span>Status</span>
            {filters.status?.length ? (
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                {filters.status.length}
              </Badge>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {statusOptions.map(option => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.status?.includes(option.value) || false}
                onCheckedChange={() => toggleStatus(option.value)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  <span>{option.label}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Priority Filter */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span>Priority</span>
            {filters.priority?.length ? (
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                {filters.priority.length}
              </Badge>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {priorityOptions.map(option => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.priority?.includes(option.value) || false}
                onCheckedChange={() => togglePriority(option.value)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  <span>{option.label}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Module Filter */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span>Module</span>
            {filters.moduleIds?.length ? (
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                {filters.moduleIds.length}
              </Badge>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            {modules.length === 0 ? (
              <DropdownMenuItem disabled>No modules created</DropdownMenuItem>
            ) : (
              modules.map(module => (
                <DropdownMenuCheckboxItem
                  key={module.id}
                  checked={filters.moduleIds?.includes(module.id) || false}
                  onCheckedChange={() => toggleModule(module.id)}
                >
                  {module.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Milestone Filter */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span>Milestone</span>
            {filters.milestoneId && filters.milestoneId !== 'all' ? (
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                1
              </Badge>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, milestoneId: undefined })}>
              All Milestones
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, milestoneId: 'none' })}>
              No Milestone
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {milestones.map(m => (
              <DropdownMenuItem
                key={m.id}
                onClick={() => onFiltersChange({ ...filters, milestoneId: m.id })}
              >
                {m.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Due Date Filter */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span>Due Date</span>
            {filters.dueDate ? (
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                1
              </Badge>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, dueDate: undefined })}>
              Any Date
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {dueDateOptions.map(option => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onFiltersChange({ ...filters, dueDate: option.value as TaskFilter['dueDate'] })}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Assignee Filter */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span>Assignee</span>
            {filters.assignee?.length ? (
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                {filters.assignee.length}
              </Badge>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            <DropdownMenuCheckboxItem
              checked={filters.assignee?.includes('unassigned') || false}
              onCheckedChange={() => toggleAssignee('unassigned')}
            >
              <span className="text-muted-foreground">Unassigned</span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {teamMembers.map(member => (
              <DropdownMenuCheckboxItem
                key={member.id}
                checked={filters.assignee?.includes(member.id) || false}
                onCheckedChange={() => toggleAssignee(member.id)}
              >
                {member.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Tags</span>
              {filters.tags?.length ? (
                <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                  {filters.tags.length}
                </Badge>
              ) : null}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
              {allTags.map(tag => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={filters.tags?.includes(tag) || false}
                  onCheckedChange={() => toggleTag(tag)}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />

        {/* Has Blockers Toggle */}
        <DropdownMenuCheckboxItem
          checked={filters.hasBlockers || false}
          onCheckedChange={(checked) => onFiltersChange({ 
            ...filters, 
            hasBlockers: checked ? true : undefined 
          })}
        >
          Show Only Blocked Tasks
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
