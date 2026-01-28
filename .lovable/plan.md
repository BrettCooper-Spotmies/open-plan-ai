
# Full Backend Integration Plan

## Overview

This plan addresses two critical requirements:
1. **OTP Email Verification** - Implement proper email verification during account creation using OTP codes
2. **Replace Mock Data** - Integrate Supabase backend across ALL features, eliminating mock data usage

---

## Part 1: OTP Email Verification

### Current State
- Auto-confirm is enabled (users bypass email verification)
- No OTP/verification flow exists
- Signup directly navigates to dashboard after creation

### Implementation

#### 1.1 Create Email Sending Edge Function

**New File:** `supabase/functions/send-otp/index.ts`

Creates an edge function using Resend to send OTP codes:
- Generates 6-digit OTP
- Stores OTP in a new `email_verifications` table with expiry
- Sends branded email via Resend API

```typescript
// Key functionality:
- Generate secure 6-digit OTP
- Store in email_verifications table (email, otp_hash, expires_at)
- Send email via Resend
- Rate limiting (max 3 requests per email per 10 minutes)
```

#### 1.2 Database Migration for OTP Storage

**New Table:** `email_verifications`
```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_email ON email_verifications(email);
```

#### 1.3 Create Verify OTP Edge Function

**New File:** `supabase/functions/verify-otp/index.ts`

Verifies the submitted OTP:
- Checks OTP against stored hash
- Validates expiry (10 minutes)
- Limits attempts (max 5)
- Returns success/failure

#### 1.4 Update Auth Flow

**Modify:** `src/services/auth.service.ts`
- Add `sendOtp(email: string)` method
- Add `verifyOtp(email: string, otp: string)` method

**New File:** `src/pages/VerifyEmail.tsx`

OTP verification page with:
- 6-digit OTP input using `input-otp` component
- Countdown timer for resend
- Error handling for invalid/expired codes
- Auto-submit on complete entry

**Modify:** `src/pages/Signup.tsx`
- After successful signup, redirect to `/verify-email` instead of `/`
- Pass email via state or URL param

**Modify:** `src/App.tsx`
- Add `/verify-email` route
- Update protected route logic to check email verification status

#### 1.5 Disable Auto-Confirm

Disable auto-confirm via Supabase auth configuration to enforce email verification.

#### 1.6 Required Secret

**RESEND_API_KEY** - Required for sending emails via Resend

---

## Part 2: Replace All Mock Data with Real Supabase Data

### Current Mock Data Usage

| Feature | Current Import | Mock Data Used |
|---------|---------------|----------------|
| Dashboard | `mockData.ts` | `projects`, `recentActivity`, `dashboardStats` |
| Team | `mockData.ts` | `extendedTeamMembers`, `projects` |
| My Day | `mockData.ts` | `projects`, `currentUser` |
| Calendar | `mockData.ts` | `projects`, `teamMembers` |
| Reports | `mockData.ts` | `projects`, `teamMembers`, `projectModules`, `projectIssues` |
| Projects | `mockData.ts` | `projects` |

### Implementation

#### 2.1 New Services

**New File:** `src/services/milestones.service.ts`
```typescript
export const milestonesService = {
  getAll(): Promise<Milestone[]>
  getByProjectId(projectId: string): Promise<Milestone[]>
  getById(id: string): Promise<Milestone | null>
  create(projectId: string, milestone: Omit<Milestone, 'id'>): Promise<Milestone>
  update(id: string, updates: Partial<Milestone>): Promise<Milestone>
  delete(id: string): Promise<void>
}
```

**New File:** `src/services/modules.service.ts`
```typescript
export const modulesService = {
  getAll(): Promise<Module[]>
  getByProjectId(projectId: string): Promise<Module[]>
  getById(id: string): Promise<Module | null>
  create(projectId: string, module: Omit<Module, 'id' | 'createdAt'>): Promise<Module>
  update(id: string, updates: Partial<Module>): Promise<Module>
  delete(id: string): Promise<void>
}
```

**New File:** `src/services/activities.service.ts`
```typescript
export const activitiesService = {
  getAll(): Promise<Activity[]>
  getByProjectId(projectId: string): Promise<Activity[]>
  getRecent(limit?: number): Promise<Activity[]>
  create(activity: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity>
}
```

**New File:** `src/services/team.service.ts`
```typescript
export const teamService = {
  getAll(): Promise<ExtendedTeamMember[]>
  getByOrganization(orgId: string): Promise<ExtendedTeamMember[]>
  getById(id: string): Promise<ExtendedTeamMember | null>
  invite(email: string, role: string, department?: string): Promise<void>
  updateRole(memberId: string, role: string): Promise<void>
  remove(memberId: string): Promise<void>
}
```

**New File:** `src/services/dashboard.service.ts`
```typescript
export const dashboardService = {
  getStats(orgId: string): Promise<DashboardStats>
  getRecentActivity(limit?: number): Promise<Activity[]>
  getUpcomingMilestones(limit?: number): Promise<Milestone[]>
}
```

#### 2.2 New React Query Hooks

**New File:** `src/hooks/useMilestones.ts`
```typescript
export function useProjectMilestones(projectId: string)
export function useMilestone(milestoneId: string)
export function useCreateMilestone()
export function useUpdateMilestone()
export function useDeleteMilestone()
```

**New File:** `src/hooks/useModules.ts`
```typescript
export function useProjectModules(projectId: string)
export function useModule(moduleId: string)
export function useCreateModule()
export function useUpdateModule()
export function useDeleteModule()
```

**New File:** `src/hooks/useActivities.ts`
```typescript
export function useRecentActivities(limit?: number)
export function useProjectActivities(projectId: string)
```

**New File:** `src/hooks/useTeam.ts`
```typescript
export function useTeamMembers()
export function useTeamMember(memberId: string)
export function useInviteTeamMember()
export function useUpdateTeamMember()
export function useRemoveTeamMember()
```

**New File:** `src/hooks/useDashboard.ts`
```typescript
export function useDashboardStats()
export function useRecentActivity()
export function useUpcomingMilestones()
```

#### 2.3 Update Query Keys

**Modify:** `src/lib/queryClient.ts`

Add keys for:
- `activities.recent`, `activities.byProject`
- `milestones.byProject`, `milestones.detail`
- `modules.byProject`, `modules.detail`
- `dashboard.stats`, `dashboard.activity`, `dashboard.milestones`
- `organizations.current`, `organizations.members`

#### 2.4 Update Feature Components

**Modify:** `src/features/dashboard/Dashboard.tsx`
```typescript
// FROM:
import { projects, recentActivity, dashboardStats } from '@/data/mockData';

// TO:
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStats, useRecentActivity, useUpcomingMilestones } from '@/hooks/useDashboard';
```

**Modify:** `src/features/team/Team.tsx`
```typescript
// FROM:
import { extendedTeamMembers, projects } from '@/data/mockData';

// TO:
import { useTeamMembers, useInviteTeamMember, useRemoveTeamMember } from '@/hooks/useTeam';
```

**Modify:** `src/features/myday/MyDay.tsx`
```typescript
// FROM:
import { projects, currentUser } from '@/data/mockData';

// TO:
import { useAllTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
```

**Modify:** `src/features/calendar/Calendar.tsx`
```typescript
// FROM:
import { projects, teamMembers } from '@/data/mockData';

// TO:
import { useProjects } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeam';
```

**Modify:** `src/features/reports/Reports.tsx`
```typescript
// FROM:
import { projects, teamMembers, projectModules, projectIssues } from '@/data/mockData';

// TO:
import { useProjects } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeam';
import { useAllIssues } from '@/hooks/useIssues';
```

**Modify:** `src/features/projects/Projects.tsx`
```typescript
// FROM:
import { projects } from '@/data/mockData';

// TO:
import { useProjects } from '@/hooks/useProjects';
```

#### 2.5 Update Environment Configuration

**Modify:** `.env` or config system
- Set `VITE_USE_SUPABASE=true`
- Set `VITE_USE_MOCK_DATA=false`

This will activate Supabase queries in all services that have dual-mode support.

#### 2.6 Add Loading States to All Features

Each feature component needs proper loading and error states:

```typescript
function Dashboard() {
  const { data: projects, isLoading, error } = useProjects();
  
  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} />;
  
  return <DashboardContent projects={projects} />;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-otp/index.ts` | Send OTP email via Resend |
| `supabase/functions/verify-otp/index.ts` | Verify submitted OTP |
| `src/pages/VerifyEmail.tsx` | OTP input page |
| `src/services/milestones.service.ts` | Milestones CRUD |
| `src/services/modules.service.ts` | Modules CRUD |
| `src/services/activities.service.ts` | Activity feed service |
| `src/services/team.service.ts` | Team management |
| `src/services/dashboard.service.ts` | Dashboard aggregations |
| `src/hooks/useMilestones.ts` | Milestone hooks |
| `src/hooks/useModules.ts` | Module hooks |
| `src/hooks/useActivities.ts` | Activity hooks |
| `src/hooks/useTeam.ts` | Team hooks |
| `src/hooks/useDashboard.ts` | Dashboard hooks |

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/auth.service.ts` | Add OTP send/verify methods |
| `src/pages/Signup.tsx` | Redirect to verify-email after signup |
| `src/App.tsx` | Add verify-email route |
| `src/lib/queryClient.ts` | Add new query keys |
| `src/features/dashboard/Dashboard.tsx` | Use real data hooks |
| `src/features/team/Team.tsx` | Use real data hooks |
| `src/features/myday/MyDay.tsx` | Use real data hooks |
| `src/features/calendar/Calendar.tsx` | Use real data hooks |
| `src/features/reports/Reports.tsx` | Use real data hooks |
| `src/features/projects/Projects.tsx` | Use real data hooks |
| `src/services/index.ts` | Export new services |

## Database Migration

One migration to add:
- `email_verifications` table for OTP storage

---

## Required Secret

Before implementing OTP email verification, you'll need to provide a **RESEND_API_KEY**. 

Do you have a Resend account? If not:
1. Sign up at https://resend.com
2. Verify your email domain at https://resend.com/domains
3. Create an API key at https://resend.com/api-keys

---

## Implementation Order

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Create new services (milestones, modules, activities, team, dashboard) | None |
| 2 | Create new React Query hooks | Phase 1 |
| 3 | Update query keys in queryClient.ts | None |
| 4 | Update Dashboard to use real data | Phase 1-3 |
| 5 | Update Team page to use real data | Phase 1-3 |
| 6 | Update My Day to use real data | Phase 1-3 |
| 7 | Update Calendar to use real data | Phase 1-3 |
| 8 | Update Reports to use real data | Phase 1-3 |
| 9 | Update Projects list to use real data | Phase 1-3 |
| 10 | Set up Resend API key secret | User input |
| 11 | Create OTP edge functions | Phase 10 |
| 12 | Create VerifyEmail page | Phase 11 |
| 13 | Update Signup flow | Phase 11-12 |
| 14 | Disable auto-confirm | Phase 11-13 |

---

## Success Criteria

After implementation:
- New users receive OTP email on signup
- Users must verify email before accessing the app
- All features display real data from Supabase
- No direct imports from `mockData.ts` in feature components
- Loading states shown during data fetch
- Error states for failed requests
- Team invitations work with real email sending
