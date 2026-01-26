
# Phase 4: Performance Optimizations - Implementation Plan

## Current State Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| Web Worker | **Created but unused** | `reportCalculations.worker.ts` exists but Reports.tsx still uses synchronous `calculateKPIs` |
| Worker Hook | **Created but unused** | `useReportWorker.ts` exists but not imported anywhere |
| Virtual List Hook | **Created but unused** | `useVirtualList.ts` exists with helpers but no components use it |
| React.memo | **Not implemented** | 0 components use React.memo |
| useCallback | **Minimal** | Only 3 uses in AddMilestoneDialog |
| Bundle Optimization | **Not configured** | No bundle analyzer or optimization scripts |

## Implementation Plan

---

### Step 1: Integrate Web Worker into Reports Page

**File:** `src/features/reports/Reports.tsx`

Currently the Reports page calculates KPIs synchronously on every filter change:
```typescript
const kpis = useMemo(() => {
  return calculateKPIs(filteredTasks, issues, dateRange);
}, [filteredTasks, issues, dateRange]);
```

**Changes:**
- Import `useReportWorker` hook
- Replace synchronous `calculateKPIs` with async worker-based calculation
- Add loading state while worker processes
- Show skeleton/spinner during calculation

---

### Step 2: Apply Virtual Scrolling to Large Lists

**Target Components:**

| Component | Current Rows | Virtualization Benefit |
|-----------|--------------|------------------------|
| `ListView.tsx` (Projects) | All tasks rendered | High - could have 100+ tasks |
| `MyDayListView.tsx` | All tasks rendered | Medium - typically 10-50 tasks |
| `ReportOpenIssuesTable.tsx` | All issues rendered | Medium - could have 50+ issues |
| `KanbanView.tsx` | Per-column tasks | Low - already column-scoped |

**Priority: Start with ListView.tsx**

**Implementation approach:**
1. Import `useVirtualList`, `getVirtualContainerStyle`, `getVirtualItemStyle` helpers
2. Wrap table body in virtual container
3. Only render visible rows + overscan buffer
4. Maintain table header sticky behavior

---

### Step 3: Add React.memo to Expensive Components

**High-impact candidates for React.memo:**

| Component | Why Expensive | Re-render Trigger |
|-----------|---------------|-------------------|
| Task cards in Kanban | Many instances, drag operations | Parent column re-renders |
| Chart components | SVG rendering | Any filter change |
| Avatar groups | Multiple per row | Row re-renders |
| Badge components | Styling calculations | Parent re-renders |

**Target files:**
- `src/features/myday/components/MyDayTaskCard.tsx`
- `src/features/reports/components/ReportTaskStatusChart.tsx`
- `src/features/reports/components/ReportTeamWorkload.tsx`
- `src/features/reports/components/ReportMilestoneHealth.tsx`
- `src/features/reports/components/ReportModuleProgress.tsx`

---

### Step 4: Add useCallback to Event Handlers

**Current problem:** Event handlers recreated on every render, causing child re-renders.

**Target areas:**
- `Reports.tsx` handlers: `handleKPIClick`, `handleStatusClick`, `handleMemberClick`, etc.
- `ListView.tsx` handlers: `handleSort`, `handleRowClick`
- `KanbanView.tsx` handlers: `handleDragEnd`, `handleTaskClick`, `handleAddTask`
- `MyDay.tsx` handlers: `handleTaskClick`, `handleStatusUpdate`

---

### Step 5: Add Bundle Optimization Scripts

**Add to package.json:**
```json
{
  "scripts": {
    "build:analyze": "vite build --mode production && npx vite-bundle-analyzer",
    "type-check": "tsc --noEmit"
  }
}
```

---

### Step 6: Optimize Vite Configuration

**Add to vite.config.ts:**
- Manual chunk splitting for large libraries (recharts, date-fns)
- Rollup treeshake options

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `src/features/reports/Reports.tsx` | Integrate useReportWorker hook | HIGH |
| `src/features/projects/components/ListView.tsx` | Add virtual scrolling | HIGH |
| `src/features/myday/components/MyDayTaskCard.tsx` | Wrap with React.memo | MEDIUM |
| `src/features/reports/components/ReportTaskStatusChart.tsx` | Wrap with React.memo | MEDIUM |
| `src/features/reports/components/ReportTeamWorkload.tsx` | Wrap with React.memo | MEDIUM |
| `src/features/reports/components/ReportMilestoneHealth.tsx` | Wrap with React.memo | MEDIUM |
| `src/features/reports/components/ReportModuleProgress.tsx` | Wrap with React.memo | MEDIUM |
| `src/features/reports/components/ReportsKPIRow.tsx` | Wrap with React.memo | MEDIUM |
| `package.json` | Add build:analyze and type-check scripts | LOW |
| `vite.config.ts` | Add chunk splitting configuration | LOW |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/VirtualTable.tsx` | Reusable virtual scrolling table component |

---

## Technical Implementation Details

### Virtual Table Component Pattern

```typescript
interface VirtualTableProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  estimateRowHeight?: number;
  onRowClick?: (item: T) => void;
}

export function VirtualTable<T>({ items, columns, estimateRowHeight = 60, onRowClick }: VirtualTableProps<T>) {
  const { parentRef, virtualItems, totalSize } = useVirtualList({
    items,
    estimateSize: estimateRowHeight,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <table>
        <thead>{/* Sticky header */}</thead>
        <tbody style={getVirtualContainerStyle(totalSize)}>
          {virtualItems.map((virtualRow) => (
            <tr key={virtualRow.key} style={getVirtualItemStyle(virtualRow.start)}>
              {/* Render row for items[virtualRow.index] */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### React.memo Pattern

```typescript
import { memo } from 'react';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
}

export const MyDayTaskCard = memo(function MyDayTaskCard({ task, onComplete }: TaskCardProps) {
  // Component implementation
});
```

### useCallback Pattern

```typescript
const handleStatusClick = useCallback((status: string) => {
  setFilter(prev => ({ ...prev, status: [status] }));
}, []);

const handleMemberClick = useCallback((memberId: string) => {
  setFilter(prev => ({ ...prev, assigneeIds: [memberId] }));
}, []);
```

---

## Success Criteria

After implementation:
- Reports page offloads KPI calculations to Web Worker
- ListView renders 100+ tasks without jank
- Chart components don't re-render on unrelated state changes
- Bundle size analyzed and optimized
- Lighthouse performance score improves

---

## Implementation Order

1. **Web Worker Integration** (Reports.tsx) - Immediate benefit for large datasets
2. **Virtual Scrolling** (ListView.tsx) - Critical for scalability
3. **React.memo** (Chart components) - Reduce unnecessary re-renders
4. **useCallback** (Event handlers) - Enable React.memo effectiveness
5. **Bundle Optimization** (Vite config) - Final polish
