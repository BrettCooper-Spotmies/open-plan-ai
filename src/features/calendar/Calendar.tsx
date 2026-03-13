import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarHeader } from './components/CalendarHeader';
import { CalendarFilters } from './components/CalendarFilters';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarWeekView } from './components/CalendarWeekView';
import { CalendarDayView } from './components/CalendarDayView';
import { TaskDetailModal } from '@/features/projects/components/TaskDetailModal';
import { MilestoneDetailModal } from '@/features/projects/components/MilestoneDetailModal';
import { IssueDetailModal } from '@/features/projects/components/IssueDetailModal';
import {
  getMonthDays,
  getWeekDays,
  navigatePrevious,
  navigateNext,
  filterCalendarEvents,
  CalendarEvent,
} from './utils/calendarUtils';
import { CalendarFilter, CalendarViewMode, Task, Milestone, Issue } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { useAllTasks, useUpdateTask } from '@/hooks/useTasks';
import { useAllIssues, useUpdateIssue } from '@/hooks/useIssues';
import { useAllMilestones, useUpdateMilestone } from '@/hooks/useMilestones';
import { useOrganizationMembers } from '@/hooks/useProjectTeam';
import { useOrganization } from '@/contexts/OrganizationContext';
import { parse, format as formatDate } from 'date-fns';
import { toast } from 'sonner';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';

// Convert a DB milestone row to calendar event
function dbMilestoneToCalendarEvent(m: any, projectName: string): CalendarEvent | null {
  const dateStr = m.due_date;
  if (!dateStr) return null;
  let date: Date;
  try {
    date = parse(dateStr, 'yyyy-MM-dd', new Date());
  } catch {
    return null;
  }
  return {
    id: m.id,
    title: m.name,
    date,
    type: 'milestone',
    projectId: m.project_id,
    projectName,
    completed: m.status === 'completed',
    description: m.description,
  };
}

// Convert a DB task to a calendar event
function taskToCalendarEvent(task: Task, projectName: string): CalendarEvent | null {
  if (!task.dueDate) return null;
  let date: Date;
  try {
    date = parse(task.dueDate, 'yyyy-MM-dd', new Date());
  } catch {
    return null;
  }
  return {
    id: task.id,
    title: task.title,
    date,
    type: 'task',
    projectId: task.projectId || '',
    projectName,
    status: task.status,
    priority: task.priority,
    assignees: task.assignees?.map(a => ({ id: a.id, name: a.name, initials: a.initials })),
    isBlocked: task.status === 'blocked' || (task.blockedBy && task.blockedBy.length > 0),
    startDate: task.startDate ? parse(task.startDate, 'yyyy-MM-dd', new Date()) : undefined,
    description: task.description,
    tags: task.tags,
  };
}

// Convert a frontend Issue to a calendar event
function issueToCalendarEvent(issue: Issue, projectName: string): CalendarEvent | null {
  if (!issue.dueDate) return null;
  let date: Date;
  try {
    date = parse(issue.dueDate, 'yyyy-MM-dd', new Date());
  } catch {
    return null;
  }
  return {
    id: issue.id,
    title: issue.title,
    date,
    type: 'issue',
    projectId: issue.projectId,
    projectName,
    severity: issue.severity,
    issueStatus: issue.status,
    description: issue.description,
    tags: issue.tags,
  };
}

// Convert DB milestone to frontend Milestone shape for the modal
function dbMilestoneToFrontend(m: any): Milestone {
  return {
    id: m.id,
    title: m.name,
    description: m.description,
    date: m.due_date || '',
    completed: m.status === 'completed',
    completedAt: undefined,
    linkedTaskIds: [],
    linkedModuleIds: [],
  };
}

const CalendarPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();

  // Real data hooks
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [], isLoading: tasksLoading } = useAllTasks();
  const { data: allMilestones = [], isLoading: milestonesLoading } = useAllMilestones();
  const { data: allIssues = [], isLoading: issuesLoading } = useAllIssues();
  const { data: teamMembers = [] } = useOrganizationMembers(currentOrganization?.id);

  // Mutations
  const updateTaskMutation = useUpdateTask();
  const updateMilestoneMutation = useUpdateMilestone();
  const updateIssueMutation = useUpdateIssue();

  const isLoading = tasksLoading || milestonesLoading || issuesLoading;

  // Derived state from search params
  const viewMode = (searchParams.get('view') as CalendarViewMode) || 'month';
  const dateParam = searchParams.get('date');
  const currentDate = useMemo(() => {
    if (!dateParam) return new Date();
    try {
      return parse(dateParam, 'yyyy-MM-dd', new Date());
    } catch {
      return new Date();
    }
  }, [dateParam]);

  // Selected entities for modals from search params
  const taskId = searchParams.get('task');
  const milestoneId = searchParams.get('milestone');
  const issueId = searchParams.get('issue');

  const selectedTask = useMemo(() => 
    taskId ? allTasks.find(t => t.id === taskId) || null : null
  , [taskId, allTasks]);
  
  const selectedMilestone = useMemo(() => {
    if (!milestoneId) return null;
    const dbM = allMilestones.find((m: any) => m.id === milestoneId);
    return dbM ? dbMilestoneToFrontend(dbM) : null;
  }, [milestoneId, allMilestones]);

  const selectedIssue = useMemo(() => 
    issueId ? allIssues.find(i => i.id === issueId) || null : null
  , [issueId, allIssues]);

  // Filter state remains local as it's complex and might be too long for URL
  const [filters, setFilters] = React.useState<CalendarFilter>({});

  // Build project map for lookups
  const projectMap = useMemo(
    () => new Map(projects.map(p => [p.id, p.name])),
    [projects]
  );

  // Aggregate all events from real data
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Tasks
    allTasks.forEach(task => {
      const projectName = projectMap.get(task.projectId || '') || 'Unknown Project';
      const event = taskToCalendarEvent(task, projectName);
      if (event) events.push(event);
    });

    // Milestones (DB shape)
    allMilestones.forEach((m: any) => {
      const projectName = projectMap.get(m.project_id) || 'Unknown Project';
      const event = dbMilestoneToCalendarEvent(m, projectName);
      if (event) events.push(event);
    });

    // Issues
    allIssues.forEach(issue => {
      const projectName = projectMap.get(issue.projectId) || 'Unknown Project';
      const event = issueToCalendarEvent(issue, projectName);
      if (event) events.push(event);
    });

    return events;
  }, [allTasks, allMilestones, allIssues, projectMap]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return filterCalendarEvents(allEvents, filters);
  }, [allEvents, filters]);

  // Get days for current view
  const days = useMemo(() => {
    if (viewMode === 'month') {
      return getMonthDays(currentDate);
    }
    return getWeekDays(currentDate);
  }, [currentDate, viewMode]);

  // Get all available tags for filter
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    allEvents.forEach(event => {
      event.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allEvents]);

  // Navigation handlers
  const updateUrlParams = (updates: Record<string, string | null>, replace = false) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace });
  };

  const handleNavigatePrevious = () => {
    const nextDate = navigatePrevious(currentDate, viewMode);
    updateUrlParams({ date: formatDate(nextDate, 'yyyy-MM-dd') }, true);
  };

  const handleNavigateNext = () => {
    const nextDate = navigateNext(currentDate, viewMode);
    updateUrlParams({ date: formatDate(nextDate, 'yyyy-MM-dd') }, true);
  };

  const handleNavigateToday = () => {
    updateUrlParams({ date: formatDate(new Date(), 'yyyy-MM-dd') }, true);
  };

  const setViewMode = (mode: CalendarViewMode) => {
    updateUrlParams({ view: mode }, true);
  };

  // Day click handler - switch to day view
  const handleDayClick = (date: Date) => {
    updateUrlParams({ 
      view: 'day',
      date: formatDate(date, 'yyyy-MM-dd')
    });
  };

  // Event click handler - open appropriate modal by adding ID to URL
  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'task') {
      updateUrlParams({ task: event.id });
    } else if (event.type === 'milestone') {
      updateUrlParams({ milestone: event.id });
    } else if (event.type === 'issue') {
      updateUrlParams({ issue: event.id });
    }
  };

  const handleModalClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('task');
    newParams.delete('milestone');
    newParams.delete('issue');
    setSearchParams(newParams);
  };

  // Get tasks for the same project (for modal context)
  const getProjectTasks = (projectId: string): Task[] => {
    return allTasks.filter(t => t.projectId === projectId);
  };

  // Build a project-like object for filters (needs id + name)
  const projectsForFilter = projects.map(p => ({
    ...p,
    tasks: [],
    milestones: [],
    issues: [],
  }));

  // Early return: show identical skeleton to Suspense fallback while data loads
  if (isLoading) {
    return <AppLayoutSkeleton variant="calendar" />;
  }

  return (
    <>
      <div className="flex flex-col h-full gap-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage project timelines, milestones, and tasks.
          </p>
        </div>

        {/* Controls Layout */}
        <div className="flex flex-col">
          {/* Header */}
          <CalendarHeader
            currentDate={currentDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNavigatePrevious={handleNavigatePrevious}
            onNavigateNext={handleNavigateNext}
            onNavigateToday={handleNavigateToday}
            actions={
              <CalendarFilters
                filters={filters}
                onFiltersChange={setFilters}
                projects={projectsForFilter as any}
                teamMembers={teamMembers}
                availableTags={availableTags}
                hideActiveFilters
              />
            }
          />

          {/* Active Filters */}
          <div className="py-2 empty:hidden">
            <CalendarFilters
              filters={filters}
              onFiltersChange={setFilters}
              projects={projectsForFilter as any}
              teamMembers={teamMembers}
              availableTags={availableTags}
              hideTrigger
            />
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-card flex flex-col">
          <>
            {viewMode === 'month' && (
              <CalendarMonthView
                days={days}
                events={filteredEvents}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'week' && (
              <CalendarWeekView
                days={days}
                events={filteredEvents}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'day' && (
              <CalendarDayView
                date={currentDate}
                events={filteredEvents}
                onEventClick={handleEventClick}
              />
            )}
          </>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={true}
          onClose={handleModalClose}
          onUpdate={async (updatedTask) => {
            try {
              if (updatedTask.projectId && updatedTask.id) {
                await updateTaskMutation.mutateAsync({
                  projectId: updatedTask.projectId,
                  taskId: updatedTask.id,
                  updates: updatedTask
                });
                toast.success('Task updated successfully');
              } else {
                toast.error('Missing project ID or task ID');
              }
            } catch (error) {
              console.error('Failed to update task:', error);
              toast.error('Failed to update task');
            }
          }}
          allTasks={getProjectTasks(selectedTask.projectId || '')}
        />
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <MilestoneDetailModal
          milestone={selectedMilestone}
          isOpen={true}
          onClose={handleModalClose}
          onUpdate={async (updatedMilestone) => {
            try {
              await updateMilestoneMutation.mutateAsync({
                id: updatedMilestone.id,
                updates: {
                  name: updatedMilestone.title,
                  description: updatedMilestone.description,
                  due_date: updatedMilestone.date,
                  status: updatedMilestone.completed ? 'completed' : 'pending'
                }
              });
              toast.success('Milestone updated successfully');
            } catch (error) {
              console.error('Failed to update milestone:', error);
              toast.error('Failed to update milestone');
            }
          }}
          tasks={[]}
          issues={[]}
          modules={[]}
        />
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={true}
          onClose={handleModalClose}
          onUpdate={async (updatedIssue) => {
            try {
              if (updatedIssue.projectId && updatedIssue.id) {
                await updateIssueMutation.mutateAsync({
                  projectId: updatedIssue.projectId,
                  issueId: updatedIssue.id,
                  updates: updatedIssue
                });
                toast.success('Issue updated successfully');
              } else {
                toast.error('Missing project ID or issue ID');
              }
            } catch (error) {
              console.error('Failed to update issue:', error);
              toast.error('Failed to update issue');
            }
          }}
          tasks={getProjectTasks(selectedIssue.projectId)}
        />
      )}
    </>
  );
};

export default CalendarPage;
