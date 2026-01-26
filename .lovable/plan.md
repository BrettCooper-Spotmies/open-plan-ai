

# Fix Full-Screen Loading Issue

## Problem Identified

When navigating to any route for the first time, users see a blank full-screen loading spinner instead of a more informative skeleton UI. This happens because:

1. All feature routes use `React.lazy()` for code splitting
2. Each route wraps the lazy component with `<Suspense fallback={<SuspenseFallback fullScreen />}>`
3. The `SuspenseFallback` component with `fullScreen={true}` renders only a centered spinner with no app shell

**Current behavior:**
```
+---------------------------+
|                           |
|                           |
|        (spinner)          |
|        Loading...         |
|                           |
+---------------------------+
```

**Desired behavior:**
```
+---------------------------+
| [Logo] OpenPlan AI        |
+--------+------------------+
| My Day | [shimmer blocks] |
| Dash   | [shimmer blocks] |
| Proj   | [shimmer blocks] |
| ...    |                  |
+--------+------------------+
```

---

## Solution Overview

Create an `AppLayoutSkeleton` component that renders the full app shell (sidebar + header) with skeleton content, giving users immediate visual feedback about the page structure.

---

## Implementation Steps

### Step 1: Create AppLayoutSkeleton Component

Create a new component that renders the AppLayout shell with skeleton placeholders for the content area.

**File:** `src/components/layout/AppLayoutSkeleton.tsx`

The component will:
- Render the actual `AppLayout` wrapper (sidebar + header are static)
- Show skeleton blocks in the content area that match typical page layouts
- Support different skeleton variants for different page types (dashboard, list, detail)

```typescript
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';

interface AppLayoutSkeletonProps {
  variant?: 'dashboard' | 'list' | 'detail' | 'default';
}

export function AppLayoutSkeleton({ variant = 'default' }: AppLayoutSkeletonProps) {
  return (
    <AppLayout>
      {/* Render appropriate skeleton based on variant */}
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'list' && <ListPageSkeleton />}
      {variant === 'detail' && <DetailPageSkeleton />}
      {variant === 'default' && <DefaultPageSkeleton />}
    </AppLayout>
  );
}
```

### Step 2: Create Page-Specific Skeleton Components

Within the same file, create skeleton patterns that match actual page layouts:

**Dashboard Skeleton:**
- Page title placeholder
- 4 KPI card skeletons in a row
- 2-column grid with card skeletons

**List Skeleton:**
- Page title + action buttons placeholder
- Filter bar skeleton
- Table/list rows skeleton

**Detail Skeleton:**
- Breadcrumb skeleton
- Main content card with sections

### Step 3: Update App.tsx Route Fallbacks

Replace the generic `<SuspenseFallback fullScreen />` with appropriate `<AppLayoutSkeleton variant="..." />` for each route:

| Route | Skeleton Variant |
|-------|-----------------|
| `/` (Dashboard) | `dashboard` |
| `/my-day` | `list` |
| `/calendar` | `default` |
| `/projects` | `list` |
| `/projects/:id` | `detail` |
| `/projects/new` | `detail` |
| `/team` | `list` |
| `/settings` | `detail` |
| `/reports` | `dashboard` |

**Example change:**
```typescript
// Before
<Route 
  path="/" 
  element={
    <Suspense fallback={<SuspenseFallback fullScreen />}>
      <Dashboard />
    </Suspense>
  } 
/>

// After
<Route 
  path="/" 
  element={
    <Suspense fallback={<AppLayoutSkeleton variant="dashboard" />}>
      <Dashboard />
    </Suspense>
  } 
/>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/AppLayoutSkeleton.tsx` | Skeleton with app shell + content placeholders |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Replace `SuspenseFallback` with `AppLayoutSkeleton` in route fallbacks |

---

## Technical Considerations

### Why AppLayout Inside Skeleton Works

The `AppLayout` component contains:
- `SidebarProvider` - Context provider (renders immediately)
- `AppSidebar` - Static sidebar navigation (renders immediately)
- `AppHeader` - Static header (renders immediately)

These components don't depend on the lazy-loaded page data, so they can render instantly while only the content area shows loading skeletons.

### Performance Impact

- **Minimal**: The sidebar and header are simple components with no data fetching
- The skeleton content is just CSS animations (no JavaScript overhead)
- Users perceive faster load times due to progressive rendering

### Animation Consistency

Use the existing `animate-pulse` class from Tailwind and the `Skeleton` component from shadcn/ui to maintain visual consistency with other loading states in the app.

---

## Visual Examples

### Dashboard Skeleton
```text
+----------------------------------------------------------+
| [logo] OpenPlan AI                          [avatar]     |
+--------+-------------------------------------------------+
| [nav]  |  [title ████████████]                           |
|        |                                                 |
| My Day |  [KPI] [KPI] [KPI] [KPI]    <- 4 shimmer cards |
| Dash   |  ░░░░░ ░░░░░ ░░░░░ ░░░░░                        |
| Proj   |                                                 |
| Cal    |  [Large Card ████████]  [Side Card ████]        |
| Report |  ░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░         |
|        |  ░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░         |
+--------+-------------------------------------------------+
```

### List Page Skeleton
```text
+----------------------------------------------------------+
| [logo] OpenPlan AI                          [avatar]     |
+--------+-------------------------------------------------+
| [nav]  |  [title ████████████]     [+ New Button]        |
|        |                                                 |
| My Day |  [Filter ░░░] [Sort ░░░]                        |
| Dash   |                                                 |
| Proj   |  [Row ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   |
| Cal    |  [Row ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   |
| Report |  [Row ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   |
|        |  [Row ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   |
+--------+-------------------------------------------------+
```

---

## Success Criteria

After implementation:
- Navigating to any route shows the sidebar and header immediately
- Content area displays appropriate skeleton placeholders
- Skeleton layout matches the actual page layout
- Smooth transition from skeleton to actual content
- No flash of empty content or layout shift

