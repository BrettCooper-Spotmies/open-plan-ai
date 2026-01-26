
# Phase 1 Completion Plan

## Current State Analysis

After exploring the codebase, I've identified what's already done and what remains:

### Already Implemented
| Component | Status | Location |
|-----------|--------|----------|
| Zustand Stores | Done | `src/stores/` (3 stores) |
| Service Layer | Done | `src/services/` (projects, tasks, issues) |
| React Query Hooks | Done | `src/hooks/` (useProjects, useTasks, useIssues) |
| Query Client + Keys | Done | `src/lib/queryClient.ts` |
| Error Boundary | Done | `src/components/ErrorBoundary.tsx` |
| Suspense Fallback | Done | `src/components/SuspenseFallback.tsx` |
| Environment Example | Partial | `.env.example` exists but missing config module |
| App Provider Setup | Done | `src/App.tsx` properly configured |

### Remaining Tasks
| Task | Priority | Effort |
|------|----------|--------|
| Create Config Module | HIGH | 10 min |
| Create Logging Service | MEDIUM | 15 min |
| Enhance Error Boundary | LOW | 10 min |
| Update Services to Use Config | LOW | 5 min |

---

## Implementation Steps

### Step 1: Create Config Module

Create a centralized configuration module that provides type-safe access to environment variables.

**File: `src/config/index.ts`**

```typescript
export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Open Plan AI',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    useMockData: import.meta.env.VITE_USE_MOCK_DATA !== 'false',
    useSupabase: import.meta.env.VITE_USE_SUPABASE === 'true',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    errorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

export type Config = typeof config;
```

---

### Step 2: Create Logging Service

Create a structured logging service for debugging and future integration with external monitoring.

**File: `src/services/monitoring/logger.ts`**

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry = this.formatEntry(level, message, context);

    if (this.isDevelopment) {
      console[level](`[${level.toUpperCase()}] ${message}`, context || '');
    }

    // Future: Send to Sentry, LogRocket, etc.
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  apiCall(method: string, url: string, status?: number) {
    this.info(`API ${method} ${url}`, { status });
  }
}

export const logger = new Logger();
```

---

### Step 3: Enhance Error Boundary with Logging

Update the existing `ErrorBoundary.tsx` to use the logger service and add a "Go Home" option.

**Changes to `src/components/ErrorBoundary.tsx`:**
- Import and use `logger` from the logging service
- Add a "Go Home" button alongside the existing buttons
- Log errors with component stack trace

---

### Step 4: Update API Client with Logging

Integrate the logger into the API client for request/response tracking.

**Changes to `src/services/api/client.ts`:**
- Import logger
- Log outgoing requests
- Log successful responses with status codes
- Log errors with details

---

### Step 5: Update Services to Use Config

Update the `projects.service.ts` to use the centralized config module.

**Changes:**
- Import config from `@/config`
- Replace direct `import.meta.env` access with `config.api.useMockData`

---

## Files Summary

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `src/config/index.ts` | Centralized configuration module |
| Create | `src/services/monitoring/logger.ts` | Structured logging service |
| Update | `src/components/ErrorBoundary.tsx` | Add logging and "Go Home" button |
| Update | `src/services/api/client.ts` | Integrate logger for API calls |
| Update | `src/services/projects.service.ts` | Use config module |
| Update | `src/services/tasks.service.ts` | Use config module |
| Update | `src/services/issues.service.ts` | Use config module |

---

## Phase 1 Completion Checklist (After Implementation)

### Core Infrastructure
- [x] Zustand stores created (projects, filters, user)
- [x] Service layer implemented (projects, tasks, issues)
- [x] React Query hooks created
- [x] Testing infrastructure setup
- [x] Error boundaries added
- [x] Environment configuration (`.env.example`)
- [x] Config module created
- [x] Logging service implemented

### Configuration
- [x] `.env.example` created
- [x] `src/config/index.ts` created
- [x] Services updated to use config

### Developer Experience
- [x] Query key factory implemented
- [x] Loading states components created
- [x] Error boundary integrated in App.tsx
- [x] React Query DevTools configured
- [x] Logger integrated in services

---

## Success Criteria

After these changes:
1. **Centralized Config** - All environment variables accessed through one module
2. **Structured Logging** - Debug-friendly console output in development
3. **Enhanced Error Recovery** - Users can navigate home after errors
4. **API Observability** - All API calls logged for debugging
5. **Clean Architecture** - No direct `import.meta.env` access in business logic
