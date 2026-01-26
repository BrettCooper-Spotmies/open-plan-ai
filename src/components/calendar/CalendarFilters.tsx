import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarFilter, TaskStatus, Priority, TeamMember, Project } from '@/types';
import { cn } from '@/lib/utils';

interface CalendarFiltersProps {
  filters: CalendarFilter;
  onFiltersChange: (filters: CalendarFilter) => void;
  projects: Project[];
  teamMembers: TeamMember[];
  availableTags: string[];
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const entityTypeOptions: { value: 'task' | 'milestone' | 'issue'; label: string }[] = [
  { value: 'task', label: 'Tasks' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'issue', label: 'Issues' },
];

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  filters,
  onFiltersChange,
  projects,
  teamMembers,
  availableTags,
}) => {
  const activeFilterCount = [
    filters.projectIds?.length,
    filters.assigneeIds?.length,
    filters.status?.length,
    filters.priority?.length,
    filters.entityType?.length,
    filters.isBlocked !== undefined ? 1 : 0,
    filters.tags?.length,
  ].filter(Boolean).length;

  const handleProjectToggle = (projectId: string) => {
    const current = filters.projectIds || [];
    const updated = current.includes(projectId)
      ? current.filter((id) => id !== projectId)
      : [...current, projectId];
    onFiltersChange({ ...filters, projectIds: updated.length ? updated : undefined });
  };

  const handleAssigneeToggle = (assigneeId: string) => {
    const current = filters.assigneeIds || [];
    const updated = current.includes(assigneeId)
      ? current.filter((id) => id !== assigneeId)
      : [...current, assigneeId];
    onFiltersChange({ ...filters, assigneeIds: updated.length ? updated : undefined });
  };

  const handleStatusToggle = (status: TaskStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, status: updated.length ? updated : undefined });
  };

  const handlePriorityToggle = (priority: Priority) => {
    const current = filters.priority || [];
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onFiltersChange({ ...filters, priority: updated.length ? updated : undefined });
  };

  const handleEntityTypeToggle = (type: 'task' | 'milestone' | 'issue') => {
    const current = filters.entityType || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, entityType: updated.length ? updated : undefined });
  };

  const handleBlockedToggle = () => {
    onFiltersChange({
      ...filters,
      isBlocked: filters.isBlocked === undefined ? true : filters.isBlocked ? false : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    const current = filters.tags || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onFiltersChange({ ...filters, tags: updated.length ? updated : undefined });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <ScrollArea className="max-h-[400px]">
            <div className="p-4 space-y-4">
              {/* Projects */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Projects
                </Label>
                <div className="space-y-1">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={filters.projectIds?.includes(project.id) || false}
                        onCheckedChange={() => handleProjectToggle(project.id)}
                      />
                      <Label htmlFor={`project-${project.id}`} className="text-sm cursor-pointer">
                        {project.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Assignees */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Assigned To
                </Label>
                <div className="space-y-1">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`assignee-${member.id}`}
                        checked={filters.assigneeIds?.includes(member.id) || false}
                        onCheckedChange={() => handleAssigneeToggle(member.id)}
                      />
                      <Label htmlFor={`assignee-${member.id}`} className="text-sm cursor-pointer">
                        {member.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Entity Types */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Type
                </Label>
                <div className="flex flex-wrap gap-1">
                  {entityTypeOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.entityType?.includes(option.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleEntityTypeToggle(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </Label>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.status?.includes(option.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleStatusToggle(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Priority
                </Label>
                <div className="flex flex-wrap gap-1">
                  {priorityOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.priority?.includes(option.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handlePriorityToggle(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Blocked toggle */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dependency State
                </Label>
                <div className="flex gap-1">
                  <Badge
                    variant={filters.isBlocked === true ? 'default' : 'outline'}
                    className={cn('cursor-pointer', filters.isBlocked === true && 'bg-destructive hover:bg-destructive/90')}
                    onClick={() => onFiltersChange({ ...filters, isBlocked: filters.isBlocked === true ? undefined : true })}
                  >
                    Blocked Only
                  </Badge>
                  <Badge
                    variant={filters.isBlocked === false ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, isBlocked: filters.isBlocked === false ? undefined : false })}
                  >
                    Unblocked Only
                  </Badge>
                </div>
              </div>

              {/* Tags */}
              {availableTags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.slice(0, 10).map((tag) => (
                        <Badge
                          key={tag}
                          variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {activeFilterCount > 0 && (
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={clearAllFilters}>
                <X className="h-3 w-3 mr-1" />
                Clear all filters
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.entityType?.map((type) => (
            <Badge key={type} variant="secondary" className="h-6 gap-1 text-xs">
              {type}
              <X
                className="h-3 w-3 cursor-pointer hover:text-foreground"
                onClick={() => handleEntityTypeToggle(type)}
              />
            </Badge>
          ))}
          {filters.status?.map((status) => (
            <Badge key={status} variant="secondary" className="h-6 gap-1 text-xs">
              {status}
              <X
                className="h-3 w-3 cursor-pointer hover:text-foreground"
                onClick={() => handleStatusToggle(status)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
