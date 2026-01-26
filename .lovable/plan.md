
# Reports Page Implementation Plan

## Overview

Create an analytics-focused Reports page that surfaces health, risk, and execution status across projects. The page provides filterable, drillable, and exportable insights about projects, tasks, milestones, and issues.

## Architecture

```text
src/pages/Reports.tsx                     # Main page component
src/components/reports/
  ├── ReportsHeader.tsx                   # Title and top controls
  ├── ReportsFilters.tsx                  # Project, time range, filters
  ├── ReportsKPIRow.tsx                   # Top KPI cards with sparklines
  ├── ReportTaskStatusChart.tsx           # Donut/bar chart for task status
  ├── ReportMilestoneHealth.tsx           # Milestone health table
  ├── ReportTeamWorkload.tsx              # Horizontal bar chart per assignee
  ├── ReportModuleProgress.tsx            # Progress bars per module
  ├── ReportOpenIssuesTable.tsx           # Sortable issues table
  ├── ReportTrendChart.tsx                # Line chart for completed tasks over time
  └── reportsUtils.ts                     # KPI calculation and data helpers
```

---

## File Changes

### 1. Add Route (`src/App.tsx`)

Add Reports route:
```typescript
import Reports from "./pages/Reports";
// ...
<Route path="/reports" element={<Reports />} />
```

### 2. Add Types (`src/types/index.ts`)

```typescript
export type ReportTimeRange = '7d' | '30d' | '90d' | 'custom';

export interface ReportFilter {
  projectId?: string;        // 'all' or single project ID
  timeRange: ReportTimeRange;
  customDateRange?: { start: string; end: string };
  moduleIds?: string[];
  milestoneIds?: string[];
  assigneeIds?: string[];
  priority?: Priority[];
  status?: TaskStatus[];
  tags?: string[];
}

export interface ReportKPI {
  projectProgress: number;      // % completed tasks
  openIssues: number;
  criticalIssues: number;
  overdueTasks: number;
  avgCycleTime: number;         // days
  trendData: { date: string; value: number }[];  // for sparkline
}
```

### 3. Create Utility Functions (`src/components/reports/reportsUtils.ts`)

Helper functions for calculating KPIs and aggregating data:

- `calculateProjectProgress(tasks)` - Returns completed/total as percentage
- `countOpenIssues(issues)` - Returns { total, critical }
- `countOverdueTasks(tasks, today)` - Tasks where dueDate < today and status !== done
- `calculateAvgCycleTime(tasks)` - Avg days from startDate to completion (for done tasks)
- `getTaskStatusBreakdown(tasks)` - Returns counts per status
- `getMilestoneHealth(milestones, tasks)` - Compute status: On Track / At Risk / Blocked / Complete
- `getTeamWorkload(tasks, teamMembers)` - Tasks per assignee with overdue count
- `getModuleProgress(tasks, modules)` - Progress per module
- `getCompletedTasksTrend(tasks, dateRange)` - Tasks completed per day/week
- `filterDataByTimeRange(items, dateField, range)` - Apply time range filter

### 4. Create Reports Header (`src/components/reports/ReportsHeader.tsx`)

- Page title: "Reports" with BarChart3 icon
- Optional subtitle showing selected project and time range
- "Save Report" button (placeholder for future functionality)

### 5. Create Reports Filters (`src/components/reports/ReportsFilters.tsx`)

Top controls row:
- **Project Selector**: Dropdown with "All Projects" + individual project options
- **Time Range Selector**: Tabs/buttons for 7d | 30d | 90d | Custom
- **Custom Date Range**: Popover with date pickers (shown when Custom selected)
- **Filter Shortcut Button**: Opens popover with:
  - Module multi-select
  - Milestone multi-select
  - Assignee multi-select
  - Priority checkboxes
  - Status checkboxes
  - Tags multi-select

### 6. Create KPI Row (`src/components/reports/ReportsKPIRow.tsx`)

Four KPI cards in a grid:

| KPI | Value | Subtitle | Visual |
|-----|-------|----------|--------|
| Project Progress | 68% | 45 of 66 tasks | Mini progress bar |
| Open Issues | 8 | 2 critical | Red badge if critical > 0 |
| Overdue Tasks | 3 | Needs attention | Warning color if > 0 |
| Avg Cycle Time | 4.2 days | Based on completed tasks | Mini sparkline |

Each card:
- Clickable (drill-down to filtered list)
- Info tooltip with formula explanation
- Consistent styling with existing DashboardStats pattern

### 7. Create Task Status Chart (`src/components/reports/ReportTaskStatusChart.tsx`)

- Donut or stacked bar chart showing tasks by status
- Uses Recharts PieChart or BarChart
- Interactive: click segments to filter task list
- Legend showing status labels and counts
- Color-coded using existing status colors from CSS

### 8. Create Milestone Health Widget (`src/components/reports/ReportMilestoneHealth.tsx`)

Table/list view:

| Status | Milestone | Progress | Tasks | Overdue |
|--------|-----------|----------|-------|---------|
| On Track (green) | Design Phase | 75% | 8/12 | 0 |
| At Risk (amber) | Prototype | 45% | 5/11 | 2 |
| Blocked (red) | Testing | 20% | 2/10 | 3 |
| Complete (gray) | Requirements | 100% | 4/4 | 0 |

Health status logic:
- Complete: All linked tasks done
- Blocked: Any linked task is blocked
- At Risk: Has overdue tasks OR < 50% complete with < 7 days to date
- On Track: Otherwise

### 9. Create Team Workload Chart (`src/components/reports/ReportTeamWorkload.tsx`)

Horizontal bar chart:
- Y-axis: Team member names
- X-axis: Task count
- Bar segments: Regular tasks (blue) + Overdue overlay (red)
- Click on bar to filter by assignee
- Shows total and overdue count per person

### 10. Create Module Progress Widget (`src/components/reports/ReportModuleProgress.tsx`)

Progress bars per module (conditional - only shown if project has modules):
- Module name with color indicator
- Progress bar
- Task count (completed/total)
- Uses existing module colors from projectModules

### 11. Create Open Issues Table (`src/components/reports/ReportOpenIssuesTable.tsx`)

Sortable table with columns:
- Severity (with icon/badge)
- Issue Title
- Blocking Count (tasks + milestones)
- Assigned
- Reported Date
- Actions (view detail)

Features:
- Sortable by severity, date, blocking count
- Click row to open issue detail
- Limited to open/investigating issues

### 12. Create Trend Chart (`src/components/reports/ReportTrendChart.tsx`)

Line chart showing:
- X-axis: Time (days/weeks based on range)
- Y-axis: Task count
- Line: Completed tasks cumulative or per-period
- Toggle: Burnup / Burndown view option
- Uses Recharts LineChart with area fill

### 13. Create Main Reports Page (`src/pages/Reports.tsx`)

Layout structure:
```
+--------------------------------------------------+
| Reports Header                                    |
+--------------------------------------------------+
| Filters Row (Project | Time Range | Filters)     |
+--------------------------------------------------+
| KPI Row (4 cards)                                |
+--------------------------------------------------+
| 2-Column Grid:                                   |
| +-------------------+  +--------------------+    |
| | Task Status Chart |  | Milestone Health   |    |
| +-------------------+  +--------------------+    |
| +-------------------+  +--------------------+    |
| | Team Workload     |  | Module Progress    |    |
| +-------------------+  +--------------------+    |
+--------------------------------------------------+
| Full Width: Trend Chart                          |
+--------------------------------------------------+
| Full Width: Open Issues Table                    |
+--------------------------------------------------+
```

State management:
- `filters`: ReportFilter state
- `selectedProject`: All or single project
- Memoized KPI calculations
- Drill-down handlers that navigate to filtered views

---

## Visual Design

### Color Palette

| Element | Color |
|---------|-------|
| Task Status Done | `--status-done` (green) |
| Task Status In Progress | `--status-in-progress` (blue) |
| Task Status Blocked | `--status-blocked` (red) |
| Milestones | Amber/gold accent |
| Critical Issues | `--destructive` (red) |
| Overdue indicator | Orange/amber warning |

### Card Styling

- Match existing Card component patterns
- Hover: `hover:shadow-md transition-shadow`
- KPI cards: Compact with clear hierarchy
- Info icons: Subtle with tooltip on hover

### Chart Configuration

Recharts setup:
- Use ChartContainer from existing chart.tsx
- Consistent color scheme via ChartConfig
- Tooltips using ChartTooltipContent
- Responsive sizing

---

## Technical Details

### Data Flow

1. Reports page loads all projects from mock data
2. Apply project filter (all or single)
3. Apply time range filter
4. Apply additional filters (module, milestone, assignee, etc.)
5. Calculate KPIs from filtered data
6. Pass filtered/aggregated data to widgets

### KPI Formulas

- **Project Progress**: `(completedTasks / totalTasks) * 100`
- **Open Issues**: Count where status in ['open', 'investigating']
- **Critical Issues**: Subset of open where severity === 'critical'
- **Overdue Tasks**: Count where dueDate < today AND status !== 'done'
- **Avg Cycle Time**: `sum(completedAt - startDate) / completedTaskCount` in days

### Drill-Down Behavior

Clicking KPIs or chart segments:
- Navigate to appropriate filtered view (tasks, issues)
- Use URL query params or state for filter persistence
- For MVP: Can navigate to project detail with appropriate section

### Placeholder Features (Future)

- Export buttons (CSV, PNG, PDF) - show disabled with tooltip
- Save report templates - button placeholder
- Schedule email delivery - not implemented in MVP
- Permissions - all users can view, export disabled

---

## Implementation Order

1. Create types and utility functions (reportsUtils.ts)
2. Create ReportsHeader component
3. Create ReportsFilters component
4. Create ReportsKPIRow component
5. Create ReportTaskStatusChart component
6. Create ReportMilestoneHealth component
7. Create ReportTeamWorkload component
8. Create ReportModuleProgress component
9. Create ReportOpenIssuesTable component
10. Create ReportTrendChart component
11. Create main Reports page
12. Add route to App.tsx
13. Verify navigation from sidebar (already configured)

---

## Dependencies

Uses existing installed packages:
- `recharts` (already installed) for all charts
- `date-fns` for date manipulation and formatting
- Existing UI components (Card, Table, Badge, Tabs, Popover, Select, Button)

No new package installations required.
