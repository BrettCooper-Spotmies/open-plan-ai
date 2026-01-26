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
  convertToCalendarEvents,
  filterCalendarEvents,
  CalendarEvent,
} from './utils/calendarUtils';
import { projects, teamMembers } from '@/data/mockData';
import { CalendarFilter, CalendarViewMode, Task, Milestone, Issue } from '@/types';

const CalendarPage: React.FC = () => {

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

  // Aggregate all events from all projects
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    projects.forEach((project) => {
      const projectEvents = convertToCalendarEvents(
        project.tasks,
        project.milestones,
        project.issues || [],
        project.id,
        project.name
      );
      events.push(...projectEvents);
    });

    return events;
  }, []);

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
    allEvents.forEach((event) => {
      event.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allEvents]);

  // Navigation handlers
  const handleNavigatePrevious = () => {
    setCurrentDate((prev) => navigatePrevious(prev, viewMode));
  };

  const handleNavigateNext = () => {
    setCurrentDate((prev) => navigateNext(prev, viewMode));
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
    // Find the source data from projects
    for (const project of projects) {
      if (event.type === 'task') {
        const task = project.tasks.find((t) => t.id === event.id);
        if (task) {
          setSelectedTask(task);
          setTaskModalOpen(true);
          return;
        }
      } else if (event.type === 'milestone') {
        const milestone = project.milestones.find((m) => m.id === event.id);
        if (milestone) {
          setSelectedMilestone(milestone);
          setMilestoneModalOpen(true);
          return;
        }
      } else if (event.type === 'issue') {
        const issue = project.issues?.find((i) => i.id === event.id);
        if (issue) {
          setSelectedIssue(issue);
          setIssueModalOpen(true);
          return;
        }
      }
    }
  };

  // Find project for modal context
  const findProjectForEntity = (type: 'task' | 'milestone' | 'issue', id: string) => {
    for (const project of projects) {
      if (type === 'task' && project.tasks.find((t) => t.id === id)) return project;
      if (type === 'milestone' && project.milestones.find((m) => m.id === id)) return project;
      if (type === 'issue' && project.issues?.find((i) => i.id === id)) return project;
    }
    return projects[0];
  };

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
                projects={projects}
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
              projects={projects}
              teamMembers={teamMembers}
              availableTags={availableTags}
              hideTrigger
            />
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-card">
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
          onUpdate={() => { }}
          allTasks={findProjectForEntity('task', selectedTask.id).tasks}
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
          onUpdate={() => { }}
          tasks={findProjectForEntity('milestone', selectedMilestone.id).tasks}
          issues={findProjectForEntity('milestone', selectedMilestone.id).issues || []}
          modules={findProjectForEntity('milestone', selectedMilestone.id).projectModules || []}
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
          onUpdate={() => { }}
          tasks={findProjectForEntity('issue', selectedIssue.id).tasks}
        />
      )}
    </AppLayout>
  );
};

export default CalendarPage;
