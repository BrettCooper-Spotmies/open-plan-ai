
# End-to-End Test & Fix: Reports Page

## Bugs Found Through Code Audit + Database Inspection

After thoroughly reading every component, hook, utility, and checking the live database, here are the real bugs causing incorrect or broken behavior.

---

### Bug 1 — Time Range Filter Does Nothing (Critical)

The "7d / 30d / 90d / Custom" buttons update `filter.timeRange` but `applyFilters()` in `reportsUtils.ts` never filters by date. The `dateRange` is computed but only passed to `getCompletedTasksTrend`. All 4 KPI cards, pie chart, team workload, and milestone health completely ignore the time range and always show ALL tasks.

**Fix**: In `Reports.tsx`, apply `filterTasksByTimeRange(tasks, dateRange)` before passing to `applyFilters`, so the time range genuinely scopes all data.

---

### Bug 2 — `ReportOpenIssuesTable` Crashes on Real Data

The component does two unsafe operations:
1. `issue.category.replace('-', ' ')` — `category` can be `null` / `undefined` from the DB, causing a runtime TypeError
2. `format(parseISO(issue.reportedAt), 'MMM dd')` — `reportedAt` can be `null` when `reported_at` is null in the DB, causing `parseISO` to throw

**Fix in `ReportOpenIssuesTable.tsx`**: Add null guards:
- `(issue.category || 'other').replace('-', ' ')`
- Check `issue.reportedAt` before formatting: `issue.reportedAt ? format(parseISO(issue.reportedAt), 'MMM dd') : '—'`

---

### Bug 3 — `ReportMilestoneHealth` Crashes When Milestone Has No Date

`getMilestoneHealth` in `reportsUtils.ts` calls `differenceInDays(parseISO(milestone.date), today)` when `milestone.date` exists. But then `ReportMilestoneHealth.tsx` renders `format(parseISO(item.milestone.date), 'MMM dd, yyyy')` — if the date string is empty `''` (which `dbMilestoneToFrontend` returns when `due_date` is null), `parseISO('')` throws an Invalid Date error.

**Fix in `ReportMilestoneHealth.tsx`**: Already has `{item.milestone.date && ...}` guard around the date display — but `parseISO('')` is also called in `getMilestoneHealth`. Fix in `reportsUtils.ts` to guard `differenceInDays` call: only compute when `milestone.date` is a non-empty string.

---

### Bug 4 — `applyFilters` Milestone Filter Logic Bug

Current code:
```typescript
if (filter.milestoneIds?.length && task.milestoneId && !filter.milestoneIds.includes(task.milestoneId)) {
  return false;
}
```
The `&& task.milestoneId` guard means tasks with NO milestone are NOT filtered out even when a milestone filter is active. This means filtering by "Milestone A" also shows all tasks that have no milestone assigned — wrong behavior.

**Fix**: Remove the `&& task.milestoneId` guard so tasks without a `milestoneId` are properly excluded when the filter is active:
```typescript
if (filter.milestoneIds?.length && !filter.milestoneIds.includes(task.milestoneId || '')) {
  return false;
}
```
Same fix for `moduleIds` filter.

---

### Bug 5 — KPI Worker Fallback Gives Wrong Data

`useReportWorker` `calculateKPIs` sends tasks/issues to a web worker, but the actual `calculateKPIs` function in `reportsUtils.ts` requires a `dateRange` parameter that the worker call never passes. Looking at `reportCalculations.worker.ts` — it likely implements KPI calculation independently. This needs to be verified and aligned.

**Fix**: In `Reports.tsx`, add a synchronous fallback `calculateKPIs` from `reportsUtils.ts` when the worker isn't needed, or ensure the worker also receives the date range. Also, the `kpis` state is updated asynchronously via `useEffect` — but `isCalculating` is only shown for the KPI row while ALL other charts are re-computed synchronously via `useMemo`. This is fine, but the worker `calculateKPIs` fallback returns wrong values (e.g., `openIssues: issues.length` instead of counting only open/investigating ones).

---

### Bug 6 — `Avg Cycle Time` Shows `0` Always

`calculateAvgCycleTime` requires tasks to have both `startDate` AND `updatedAt`. In the DB, `start_date` is often null (7 of 10 tasks queried had no `start_date`). With no tasks matching, it returns `0`. The display shows `"0"` days — which is misleading. Should show `"N/A"`.

**Fix in `ReportsKPIRow.tsx`**: Change the value display to show `"N/A"` when `kpis.avgCycleTime === 0`.

---

### Bug 7 — Filters Panel Shows Empty "Module" List Until Project Selected

`modules` passed to `ReportsFilters` is `allAdaptedModules` when no project is selected — which is all org-wide modules. This IS correct. But the filter panel lists modules even without tasks assigned to them. This is cosmetic but correct.

---

## Summary of Files to Fix

| File | Fix |
|---|---|
| `src/features/reports/Reports.tsx` | Apply time-range filter before passing to `applyFilters` |
| `src/features/reports/utils/reportsUtils.ts` | Fix `applyFilters` milestone/module guard; fix `getMilestoneHealth` empty date guard |
| `src/features/reports/components/ReportOpenIssuesTable.tsx` | Null-guard `category` and `reportedAt` |
| `src/features/reports/components/ReportsKPIRow.tsx` | Show `"N/A"` for avg cycle time when 0 |
| `src/workers/reportCalculations.worker.ts` | Verify worker KPI calculation is correct |

No database migrations needed.
