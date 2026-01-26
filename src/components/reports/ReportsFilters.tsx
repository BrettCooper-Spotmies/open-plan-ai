import { useState } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Project, TeamMember, Module, Milestone, Priority, TaskStatus } from '@/types';
import { ReportTimeRange, ReportFilter } from './reportsUtils';
import { format } from 'date-fns';

interface ReportsFiltersProps {
  projects: Project[];
  teamMembers: TeamMember[];
  modules: Module[];
  milestones: Milestone[];
  filter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
}

const timeRangeOptions: { value: ReportTimeRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];

const priorityOptions: Priority[] = ['critical', 'high', 'medium', 'low'];
const statusOptions: TaskStatus[] = ['todo', 'in-progress', 'review', 'done', 'blocked'];

export function ReportsFilters({
  projects,
  teamMembers,
  modules,
  milestones,
  filter,
  onFilterChange,
}: ReportsFiltersProps) {
  const [showCustomDate, setShowCustomDate] = useState(filter.timeRange === 'custom');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const activeFilterCount = [
    filter.moduleIds?.length,
    filter.milestoneIds?.length,
    filter.assigneeIds?.length,
    filter.priority?.length,
    filter.status?.length,
    filter.tags?.length,
  ].filter(Boolean).length;

  const handleTimeRangeChange = (value: ReportTimeRange) => {
    setShowCustomDate(value === 'custom');
    onFilterChange({ ...filter, timeRange: value });
  };

  const handleProjectChange = (value: string) => {
    onFilterChange({
      ...filter,
      projectId: value === 'all' ? undefined : value
    });
  };

  const handleAssigneeToggle = (memberId: string) => {
    const current = filter.assigneeIds || [];
    const updated = current.includes(memberId)
      ? current.filter(id => id !== memberId)
      : [...current, memberId];
    onFilterChange({ ...filter, assigneeIds: updated.length ? updated : undefined });
  };

  const handlePriorityToggle = (priority: Priority) => {
    const current = filter.priority || [];
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onFilterChange({ ...filter, priority: updated.length ? updated : undefined });
  };

  const handleStatusToggle = (status: TaskStatus) => {
    const current = filter.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFilterChange({ ...filter, status: updated.length ? updated : undefined });
  };

  const handleModuleToggle = (moduleId: string) => {
    const current = filter.moduleIds || [];
    const updated = current.includes(moduleId)
      ? current.filter(id => id !== moduleId)
      : [...current, moduleId];
    onFilterChange({ ...filter, moduleIds: updated.length ? updated : undefined });
  };

  const clearFilters = () => {
    onFilterChange({
      projectId: filter.projectId,
      timeRange: filter.timeRange,
      customDateRange: filter.customDateRange,
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Project Selector - Left Side */}
      <div className="flex items-center">
        <Select
          value={filter.projectId || 'all'}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-3">
        {/* Time Range Selector */}
        <div className="flex items-center rounded-md border bg-background">
          {timeRangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter.timeRange === option.value ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none first:rounded-l-md last:rounded-r-md"
              onClick={() => handleTimeRangeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Custom Date Range */}
        {showCustomDate && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {dateRange.from && dateRange.to
                  ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                  : 'Select dates'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  setDateRange({ from: range?.from, to: range?.to });
                  if (range?.from && range?.to) {
                    onFilterChange({
                      ...filter,
                      customDateRange: {
                        start: format(range.from, 'yyyy-MM-dd'),
                        end: format(range.to, 'yyyy-MM-dd'),
                      },
                    });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Advanced Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <Separator />

              {/* Assignee Filter */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">Assignee</h5>
                <div className="grid grid-cols-2 gap-2">
                  {teamMembers.slice(0, 6).map(member => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={filter.assigneeIds?.includes(member.id)}
                        onCheckedChange={() => handleAssigneeToggle(member.id)}
                      />
                      <span className="truncate">{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Priority Filter */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">Priority</h5>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map(priority => (
                    <label
                      key={priority}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={filter.priority?.includes(priority)}
                        onCheckedChange={() => handlePriorityToggle(priority)}
                      />
                      <span className="capitalize">{priority}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status Filter */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">Status</h5>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(status => (
                    <label
                      key={status}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={filter.status?.includes(status)}
                        onCheckedChange={() => handleStatusToggle(status)}
                      />
                      <span className="capitalize">{status.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Module Filter */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">Module</h5>
                <div className="grid grid-cols-2 gap-2">
                  {modules.map(module => (
                    <label
                      key={module.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={filter.moduleIds?.includes(module.id)}
                        onCheckedChange={() => handleModuleToggle(module.id)}
                      />
                      <span className="truncate">{module.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
