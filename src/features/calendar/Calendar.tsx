import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
import { useAllTasks } from '@/hooks/useTasks';
import { useAllIssues } from '@/hooks/useIssues';
import { useAllMilestones } from '@/hooks/useMilestones';
import { useOrganizationMembers } from '@/hooks/useProjectTeam';
import { useOrganization } from '@/contexts/OrganizationContext';
import { parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';

// Convert a DB milestone row to calendar event
function dbMilestoneToCalendarEvent(m: any, projectName: string): CalendarEvent | null {
  const dateStr = m.due_date;
  if (!dateStr) return null;
  let date: Date;
  try {
    date = parseISO(dateStr);
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
    date = parseISO(task.dueDate);
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
    startDate: task.startDate ? parseISO(task.startDate) : undefined,
    description: task.description,
    tags: task.tags,
  };
}

// Convert a frontend Issue to a calendar event
function issueToCalendarEvent(issue: Issue, projectName: string): CalendarEvent | null {
  if (!issue.dueDate) return null;
  let date: Date;
  try {
    date = parseISO(issue.dueDate);
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

  // Real data hooks
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [], isLoading: tasksLoading } = useAllTasks();
  const { data: allMilestones = [], isLoading: milestonesLoading } = useAllMilestones();
  const { data: allIssues = [], isLoading: issuesLoading } = useAllIssues();
  const { data: teamMembers = [] } = useOrganizationMembers(currentOrganization?.id);

  const isLoading = tasksLoading || milestonesLoading || issuesLoading;

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [filters, setFilters] = useState<CalendarFilter>({});

  // Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);

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
  const handleNavigatePrevious = () => {
    setCurrentDate(prev => navigatePrevious(prev, viewMode));
  };

  const handleNavigateNext = () => {
    setCurrentDate(prev => navigateNext(prev, viewMode));
  };

  const handleNavigateToday = () => {
    setCurrentDate(new Date());
  };

  // Day click handler - switch to day view
  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  // Event click handler - open appropriate modal
  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'task') {
      const task = allTasks.find(t => t.id === event.id);
      if (task) {
        setSelectedTask(task);
        setTaskModalOpen(true);
      }
    } else if (event.type === 'milestone') {
      const dbMilestone = allMilestones.find((m: any) => m.id === event.id);
      if (dbMilestone) {
        setSelectedMilestone(dbMilestoneToFrontend(dbMilestone));
        setMilestoneModalOpen(true);
      }
    } else if (event.type === 'issue') {
      const issue = allIssues.find(i => i.id === event.id);
      if (issue) {
        setSelectedIssue(issue);
        setIssueModalOpen(true);
      }
    }
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

  return (
    <AppLayout>
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
        <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-card">
          {isLoading ? (
            <div className="flex-1 h-full flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading calendar data…</span>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {taskModalOpen && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={taskModalOpen}
          onClose={() => {
            setTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onUpdate={() => {}}
          allTasks={getProjectTasks(selectedTask.projectId || '')}
        />
      )}

      {/* Milestone Detail Modal */}
      {milestoneModalOpen && selectedMilestone && (
        <MilestoneDetailModal
          milestone={selectedMilestone}
          isOpen={milestoneModalOpen}
          onClose={() => {
            setMilestoneModalOpen(false);
            setSelectedMilestone(null);
          }}
          onUpdate={() => {}}
          tasks={[]}
          issues={[]}
          modules={[]}
        />
      )}

      {/* Issue Detail Modal */}
      {issueModalOpen && selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={issueModalOpen}
          onClose={() => {
            setIssueModalOpen(false);
            setSelectedIssue(null);
          }}
          onUpdate={() => {}}
          tasks={getProjectTasks(selectedIssue.projectId)}
        />
      )}
    </AppLayout>
  );
};

export default CalendarPage;
