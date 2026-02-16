# Applying the Soft Delete RPC Migration

## Summary
To fix the 403 Forbidden errors when deleting tasks, modules, milestones, and issues, you need to apply the database migration that creates secure RPC functions with SECURITY DEFINER privileges.

## Migration File Created
- **Location**: `supabase/migrations/20260205021700_add_soft_delete_functions.sql`
- **Purpose**: Creates RPC functions that bypass RLS policies while maintaining security through manual permission checks

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Apply migration to remote database
npx supabase db push
```

### Option 2: Manual SQL Execution

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Click on "SQL Editor" in the left sidebar
4. Create a new query
5. Copy and paste the contents of `supabase/migrations/20260205021700_add_soft_delete_functions.sql`
6. Click "Run" to execute the migration

## What the Migration Does

The migration creates four RPC functions:
- `soft_delete_task(task_id UUID)`
- `soft_delete_module(module_id UUID)`
- `soft_delete_milestone(milestone_id UUID)`
- `soft_delete_issue(issue_id UUID)`

Each function:
1. Checks if the user has access to the project containing the entity
2. If authorized, updates the `deleted_at` timestamp
3. Throws an error if unauthorized

## Code Changes Already Made

✅ All service files updated to use RPC functions instead of direct UPDATE queries:
- `src/services/tasks.service.ts`
- `src/services/modules.service.ts`
- `src/services/milestones.service.ts`
- `src/services/issues.service.ts`

✅ TypeScript types updated to include the new RPC functions:
- `src/integrations/supabase/types.ts`

## After Applying the Migration

Once the migration is applied, soft delete operations will work correctly for all entity types without 403 Forbidden errors.
