

# Fix Issue Creation Modal and Task File Preview

## Summary
Three UI bugs need to be fixed in the project detail flow:
1. "Issue not found" error when clicking maximize in issue creation modal
2. Scrolling not working in the issue creation modal  
3. Clicking on uploaded files in task creation doesn't open them

## Root Cause Analysis

### Issue 1: "Issue not found" on maximize
The `IssueDetailModal` passes an `onExpand` callback to `IssueDetailContent`, which attempts to navigate to `/projects/:projectId/issues/:issueId`. In "create" mode, the issue only exists as a draft in local state and hasn't been saved to the database. When `IssuePage.tsx` loads, it looks for the issue in mock data, fails to find it, and shows "Issue not found".

**Fix**: Conditionally pass `onExpand` only when in "view" mode. When `mode === 'create'`, don't provide the expand function so the maximize button won't render.

### Issue 2: Scrolling not working
The `IssueDetailModal` uses `ScrollArea` with `className="flex-1 max-h-[90vh]"` inside a `DialogContent` that also has `max-h-[90vh]`. The content area contains a `div` with `p-6` padding that wraps `IssueDetailContent`. The issue is:
- The `ScrollArea` is fighting with the dialog's max-height constraints
- The ScrollArea Viewport doesn't have proper overflow settings

**Fix**: Add `overflow-y-auto` to ensure proper scrolling and adjust the layout to properly cascade the height constraints through the component tree.

### Issue 3: File preview not opening
In `TaskDetailModal.tsx`, the attachment row has a Download button that renders an icon but has no `onClick` handler. Users expect clicking the attachment or the download button to open the file in a new window.

**Fix**: 
- Add an `onClick` handler to the Download button that opens the attachment URL in a new window/tab
- Make the entire attachment clickable to preview the file

## Changes

### File: `src/features/projects/components/IssueDetailModal.tsx`

**Change 1**: Only pass `onExpand` when not in create mode
- Move the navigation logic to only run when `mode !== 'create'`
- Pass `undefined` for `onExpand` when in create mode so the maximize button doesn't render

**Change 2**: Fix ScrollArea for proper scrolling
- Add `overflow-y-auto` to the ScrollArea wrapper
- Ensure the DialogContent flexbox layout properly constrains children

### File: `src/features/projects/components/TaskDetailModal.tsx`

**Change 1**: Add click handler to open attachments
- Add `onClick` handler to the file row that opens the attachment URL in a new tab
- Add `onClick` handler to the Download button that triggers file download
- Add `cursor-pointer` to make the attachment row visually clickable

## Technical Details

### IssueDetailModal.tsx Changes

```text
Line 94-118: Update the onExpand prop logic

Current code passes onExpand in all cases:
<IssueDetailContent
  issue={issue}
  tasks={tasks}
  onUpdate={onUpdate}
  onExpand={() => { ... }}
/>

New code will check mode first:
<IssueDetailContent
  issue={issue}
  tasks={tasks}
  onUpdate={onUpdate}
  onExpand={mode === 'create' ? undefined : () => { ... }}
/>

Line 89: Fix DialogContent flex layout
- Change to: className="max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"

Line 94: Fix ScrollArea for scrolling
- Change to: className="flex-1 overflow-y-auto"
- Remove duplicated max-h constraint that conflicts with parent
```

### TaskDetailModal.tsx Changes

```text
Lines 877-906: Update attachment row with click handlers

Add onClick handler to the attachment container:
<div
  key={attachment.id}
  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group cursor-pointer hover:bg-muted"
  onClick={() => window.open(attachment.url, '_blank')}
>
  ...

Update Download button with click handler:
<Button 
  variant="ghost" 
  size="icon" 
  className="h-7 w-7"
  onClick={(e) => {
    e.stopPropagation();
    window.open(attachment.url, '_blank');
  }}
>
  <Download className="h-4 w-4" />
</Button>

Add stopPropagation to the delete button to prevent file opening when deleting:
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7"
  onClick={(e) => {
    e.stopPropagation();
    handleRemoveAttachment(attachment.id);
  }}
>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/projects/components/IssueDetailModal.tsx` | Conditional onExpand, fix ScrollArea |
| `src/features/projects/components/TaskDetailModal.tsx` | Add attachment click handlers |

