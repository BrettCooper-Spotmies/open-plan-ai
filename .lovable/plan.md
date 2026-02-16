

# Fix: Add Missing `type` Column to Projects Table

## Problem

The `projects` table in the database does not have a `type` column, but the frontend sends a `type` field (e.g., "Hardware Development") when creating a project. PostgREST returns error `PGRST204: Could not find the 'type' column of 'projects' in the schema cache`.

## Solution

Add the `type` column to the `projects` table via a database migration, and reload the PostgREST schema cache.

## Changes

### Database Migration

```sql
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS type text;
NOTIFY pgrst, 'reload schema';
```

This is a single migration — no frontend code changes needed since the code already sends the `type` field correctly.

| Change | Description |
|--------|-------------|
| Database migration | Add `type` text column to `projects` table and refresh schema cache |

