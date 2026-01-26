

# Calendar Page Implementation Plan

## Overview

Create a comprehensive Calendar page that provides time-based visibility into project execution. The calendar displays Tasks, Milestones, and critical Issues across Month, Week, and Day views with robust filtering capabilities.

## Architecture

```text
src/pages/Calendar.tsx                    # Main page component
src/components/calendar/
  ├── CalendarHeader.tsx                  # Title, view toggle, navigation
  ├── CalendarFilters.tsx                 # Filter dropdowns/chips
  ├── CalendarMonthView.tsx               # Month grid view
  ├── CalendarWeekView.tsx                # Week view (7 columns)
  ├── CalendarDayView.tsx                 # Single day detailed view
  ├── CalendarEventCard.tsx               # Task/Milestone/Issue card
  ├── CalendarEventPreview.tsx            # Hover preview card
  └── calendarUtils.ts                    # Date helpers and event grouping
```

---

## File Changes

### 1. Create Calendar Page (`src/pages/Calendar.tsx`)

Main page component with:
- State for current date, view mode (month/week/day), and filters
- Data aggregation from all projects (tasks, milestones, issues)
- Filter application logic
- View component selection based on mode

### 2. Create Calendar Header (`src/components/calendar/CalendarHeader.tsx`)

- Page title with calendar icon
- View toggle tabs: Month | Week | Day
- Navigation controls: Previous, Today button, Next
- Display current date/range label

### 3. Create Calendar Filters (`src/components/calendar/CalendarFilters.tsx`)

Filter options using existing patterns from TaskFilters:
- Project (multi-select dropdown)
- Assigned To (multi-select with avatars)
- Status (checkbox group)
- Priority (checkbox group)
- Type (Task / Milestone / Issue)
- Dependency State (Blocked / Unblocked toggle)
- Tags/Labels (multi-select)

### 4. Create Month View (`src/components/calendar/CalendarMonthView.tsx`)

- 7-column grid with day headers (Sun-Sat)
- 5-6 row grid for weeks
- Each cell shows date number and stacked event indicators
- Outside-month dates shown muted
- Click on day navigates to Day view
- Events grouped by date with max visible count + overflow indicator

### 5. Create Week View (`src/components/calendar/CalendarWeekView.tsx`)

- 7-column layout for days of the week
- Time slots shown vertically (optional - can be simplified to just day columns)
- Tasks/events shown as cards within their day column
- Scrollable event list per day
- More detailed than month view

### 6. Create Day View (`src/components/calendar/CalendarDayView.tsx`)

- Single day focus
- Full list of tasks, milestones, and issues for that day
- Grouped by type or shown chronologically
- Most detailed view with full event cards

### 7. Create Event Card (`src/components/calendar/CalendarEventCard.tsx`)

Visual card component with entity-specific styling:

**Tasks:**
- Title truncated
- Status color indicator (left border or dot)
- Priority badge (if critical/high)
- Assignee avatar(s)
- Blocked indicator (muted + warning icon)

**Milestones:**
- Flag icon prefix
- Distinct styling (e.g., filled background, milestone color)
- Completion indicator

**Issues:**
- Alert icon with severity-based color
- Only shows critical/blocking issues
- Severity badge

### 8. Create Event Preview (`src/components/calendar/CalendarEventPreview.tsx`)

Hover card component using existing HoverCard:
- Entity type label
- Full title
- Status and priority
- Assignees
- Due date / target date
- Project name
- Brief description snippet

### 9. Create Calendar Utilities (`src/components/calendar/calendarUtils.ts`)

Helper functions:
- `getMonthDays(date)` - Returns array of day objects for calendar grid
- `getWeekDays(date)` - Returns 7 days of the current week
- `groupEventsByDate(events)` - Groups tasks/milestones/issues by date
- `filterCalendarEvents(events, filters)` - Apply filter criteria
- `formatDateRange(start, end, view)` - Format display label

### 10. Add Route (`src/App.tsx`)

Add Calendar route:
```typescript
import Calendar from "./pages/Calendar";
// ...
<Route path="/calendar" element={<Calendar />} />
```

### 11. Create Filter Type (`src/types/index.ts`)

Add CalendarFilter interface:
```typescript
export interface CalendarFilter {
  projectIds?: string[];
  assigneeIds?: string[];
  status?: TaskStatus[];
  priority?: Priority[];
  entityType?: ('task' | 'milestone' | 'issue')[];
  isBlocked?: boolean;
  tags?: string[];
}

export type CalendarViewMode = 'month' | 'week' | 'day';
```

---

## Visual Design

### Entity Styling

| Entity    | Visual Style                                                  |
|-----------|---------------------------------------------------------------|
| Task      | Standard card, status color left border, priority badge       |
| Milestone | Flag icon, distinct fill color, stronger visual weight        |
| Issue     | Alert indicator, severity-based color (red/orange), warning   |
| Blocked   | Muted opacity (60%), warning icon overlay                     |
| Critical  | Strong emphasis - bold border, priority badge highlighted     |

### Color Mapping

- Tasks: Use existing status colors (`--status-todo`, `--status-in-progress`, etc.)
- Milestones: Amber/gold accent (`--chart-4`)
- Critical Issues: Red (`--destructive`)
- Major Issues: Orange (`--priority-high`)

### Layout Spacing

- Consistent gap-4 between sections
- p-4 padding in content areas
- Month cells: min-height for proper event stacking
- Week/Day columns: scrollable overflow

---

## Technical Details

### Data Flow

1. Calendar page loads all projects from mock data
2. Extracts tasks, milestones, and issues (filtered to critical/blocking only for issues)
3. Applies user-selected filters
4. Groups by date based on:
   - Tasks: `dueDate` (primary), `startDate` (secondary indicator)
   - Milestones: `date`
   - Issues: `dueDate` (if set)
5. Passes grouped data to view components

### Filter Logic

Filters are combined with AND logic:
- Project filter: Show only items from selected projects
- Assignee filter: Show items with selected assignees (or unassigned option)
- Status filter: Match task status
- Priority filter: Match task/issue priority
- Type filter: Show only selected entity types
- Blocked filter: Toggle to show only blocked items

### Navigation

- Previous/Next buttons shift by view unit (month/week/day)
- Today button returns to current date
- Clicking a day in Month view switches to Day view
- Clicking an event opens the appropriate detail modal

### Integration with Existing Modals

Clicking calendar events opens:
- Tasks: `TaskDetailModal`
- Milestones: `MilestoneDetailModal`
- Issues: `IssueDetailModal`

---

## Implementation Order

1. Create types and utility functions
2. Create CalendarEventCard and CalendarEventPreview components
3. Create CalendarFilters component
4. Create CalendarHeader component
5. Create CalendarMonthView
6. Create CalendarWeekView
7. Create CalendarDayView
8. Create main Calendar page
9. Add route to App.tsx
10. Integration testing with detail modals

---

## Dependencies

Uses existing installed packages:
- `date-fns` for date manipulation
- `@radix-ui/react-hover-card` for previews
- Existing UI components (Tabs, Button, Popover, Checkbox, Select, Badge)

No new package installations required.

