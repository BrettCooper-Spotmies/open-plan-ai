
# Add PDF & CSV Export to Reports Page

## Overview

The Export button already exists in `ReportsHeader` but is disabled with a "coming soon" tooltip. This plan enables it with a functional dropdown offering both CSV and PDF export, all client-side with no new dependencies (jsPDF/html2canvas are heavy — we'll use the browser's native `print` for PDF and manual CSV string construction for CSV, both requiring zero new packages).

## Approach: No New Dependencies

- **CSV**: Build a comma-separated string from all report data sections and trigger a file download via a hidden `<a>` link — pure JavaScript, no library needed.
- **PDF**: Use `window.print()` with a dedicated print stylesheet (`@media print`) that hides the sidebar/header/filters and renders only the report content cleanly. This gives a native OS print-to-PDF experience with zero bundle size cost.

## Data to Export

Both formats will include:

| Section | CSV Sheet / PDF Section |
|---|---|
| KPIs | Summary table (Progress, Open Issues, Overdue Tasks, Avg Cycle Time) |
| Task Status Breakdown | Rows: status, count, percentage |
| Milestone Health | Rows: name, status, progress%, tasks, due date |
| Team Workload | Rows: member name, total, completed, in-progress, overdue |
| Module Progress | Rows: module name, progress%, completed, total |
| Trend Data | Rows: date, completed, cumulative, remaining |
| Open Issues | Rows: title, severity, category, status, blocking count, reported date |

## File Changes

### 1. `src/features/reports/components/ReportsHeader.tsx`
- Accept an `onExport: (format: 'csv' | 'pdf') => void` prop
- Replace the disabled single Export button with a `DropdownMenu` containing:
  - **Export as CSV** (Download icon)
  - **Export as PDF** (FileText icon)
- Remove the disabled `Save Report` button (or keep as-is)

### 2. `src/features/reports/utils/exportUtils.ts` (new file)
Create a dedicated export utilities module:

```typescript
// buildCSV(reportData): string
// Assembles a multi-section CSV string with blank lines between sections
// Each section has a header row, then data rows

// downloadCSV(filename, content): void
// Creates a Blob, triggers <a> click for download

// triggerPDFExport(): void
// Calls window.print() — CSS handles layout
```

The CSV will have this structure:
```
OPENPLAN REPORT
Generated: Feb 18, 2026
Project: All Projects
Time Range: Last 30 days

=== KEY PERFORMANCE INDICATORS ===
Metric,Value,Details
Project Progress,72%,18 of 25 tasks
Open Issues,3,1 critical
Overdue Tasks,2,Needs attention
Avg Cycle Time,4.5,days per task

=== TASK STATUS BREAKDOWN ===
Status,Count,Percentage
To Do,5,20%
In Progress,8,32%
...

=== MILESTONE HEALTH ===
Milestone,Status,Progress,Completed Tasks,Total Tasks,Due Date
...

(etc for all sections)
```

### 3. `src/features/reports/Reports.tsx`
- Import `downloadCSVReport` and `triggerPDFExport` from new `exportUtils.ts`
- Create `handleExport(format: 'csv' | 'pdf')` callback that:
  - For CSV: calls `downloadCSVReport({ kpis, statusBreakdown, milestoneHealth, teamWorkload, moduleProgress, trendData, issues, projectName, timeRangeLabel })`
  - For PDF: calls `triggerPDFExport()`
- Pass `onExport={handleExport}` to `<ReportsHeader />`

### 4. `src/index.css` (print styles)
Add `@media print` rules to hide nav/sidebar and show only report content cleanly:

```css
@media print {
  /* Hide layout chrome */
  [data-sidebar], nav, aside, header { display: none !important; }
  
  /* Remove scroll constraints */
  body, main, .overflow-hidden { overflow: visible !important; }
  
  /* Page breaks between chart sections */
  .grid > * { break-inside: avoid; }
  
  /* Ensure cards print with borders */
  .card { border: 1px solid #e2e8f0 !important; }
}
```

## User Experience Flow

```
User clicks "Export" button
         ↓
Dropdown appears with two options:
  [↓ Export as CSV]   ← triggers immediate download
  [⎙ Export as PDF]   ← opens browser print dialog
```

The CSV downloads instantly (filename: `report-YYYY-MM-DD.csv`).
The PDF opens the system print dialog where users can choose "Save as PDF", select orientation, etc.

## Technical Notes

- All data is already computed in `Reports.tsx` via `useMemo` — no re-fetching needed for export
- The `handleExport` callback receives the already-filtered, already-computed data — exporting exactly what the user is currently viewing
- The export respects active filters (project scope, time range, assignee filters, etc.)
- No new `npm` packages required — zero bundle size impact

## Files Modified

| File | Type | Change |
|---|---|---|
| `src/features/reports/components/ReportsHeader.tsx` | Edit | Enable Export dropdown with CSV + PDF options |
| `src/features/reports/utils/exportUtils.ts` | New | CSV builder + download trigger + PDF print trigger |
| `src/features/reports/Reports.tsx` | Edit | Wire up export handler, pass to header |
| `src/index.css` | Edit | Add `@media print` styles for clean PDF output |
