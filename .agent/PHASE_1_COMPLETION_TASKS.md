# Phase 1 Completion Tasks - Open Plan AI

**Project:** Open Plan AI  
**Phase:** 1 - Foundation (Final Polish)  
**Status:** 85% Complete - Need to finish remaining items  
**Target:** Production-ready foundation layer

---

## 📋 **What's Already Done** ✅

Before we start, here's what you've already accomplished:

- ✅ Zustand stores (3 stores: projects, filters, user)
- ✅ Service layer (projects, tasks, issues)
- ✅ React Query hooks (useProjects, useTasks, useIssues)
- ✅ Testing infrastructure setup
- ✅ Mock data integration
- ✅ TypeScript types

**Great work!** Now let's complete the remaining Phase 1 tasks.

---

## 🎯 **Remaining Tasks to Complete Phase 1**

### **Task 1: Add Error Boundaries** 🚨

**Priority:** HIGH  
**Time Estimate:** 30 minutes  
**Why:** Prevents entire app from crashing when errors occur

#### **What to Build:**

Create a global error boundary component that catches React errors and shows a user-friendly fallback UI.

#### **Files to Create:**

**1. `src/components/ErrorBoundary.tsx`**

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
    window.location.href = '/';
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. We've logged the issue and will look into it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-4 bg-muted rounded-lg border">
                  <p className="text-sm font-semibold mb-2">Error Details:</p>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={this.handleRefresh} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-sm font-semibold cursor-pointer">
                    Stack Trace (Dev Only)
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-60">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**2. Update `src/App.tsx`**

Wrap your app with the ErrorBoundary:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Rest of your app */}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**3. Create Feature-Specific Error Boundaries (Optional but Recommended)**

Create `src/components/FeatureErrorBoundary.tsx`:

```typescript
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureErrorBoundaryProps {
  children: React.ReactNode;
  featureName: string;
}

export function FeatureErrorBoundary({ children, featureName }: FeatureErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="m-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error in {featureName}</CardTitle>
            </div>
            <CardDescription>
              This feature encountered an error. The rest of the app is still working.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Try refreshing the page or navigating to a different section.
            </p>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

**Usage in pages:**
```typescript
// src/pages/Reports.tsx
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

export default function Reports() {
  return (
    <FeatureErrorBoundary featureName="Reports">
      {/* Your reports content */}
    </FeatureErrorBoundary>
  );
}
```

---

### **Task 2: Add Environment Configuration** 🔧

**Priority:** HIGH  
**Time Estimate:** 15 minutes  
**Why:** Proper environment management for different deployment stages

#### **Files to Create:**

**1. `.env.example`**

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_DATA=true

# Supabase Configuration (for future use)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
VITE_ENABLE_DEVTOOLS=true

# App Configuration
VITE_APP_NAME=Open Plan AI
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development
```

**2. `.env.development`**

```env
# Development Environment
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_DATA=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
VITE_ENABLE_DEVTOOLS=true
VITE_APP_ENV=development
```

**3. `.env.production`**

```env
# Production Environment
VITE_API_BASE_URL=https://api.yourapp.com
VITE_USE_MOCK_DATA=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
VITE_ENABLE_DEVTOOLS=false
VITE_APP_ENV=production
```

**4. Create `src/config/index.ts`**

```typescript
export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Open Plan AI',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    env: import.meta.env.VITE_APP_ENV || 'development',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    useMockData: import.meta.env.VITE_USE_MOCK_DATA !== 'false',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    errorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
    devtools: import.meta.env.VITE_ENABLE_DEVTOOLS !== 'false',
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

// Type-safe config access
export type Config = typeof config;
```

**5. Update `.gitignore`**

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.production.local

# Keep example files
!.env.example
```

**6. Update services to use config**

Update `src/services/projects.service.ts`:

```typescript
import { config } from '@/config';

const USE_MOCK_DATA = config.api.useMockData;
```

---

### **Task 3: Add Logging Service** 📝

**Priority:** MEDIUM  
**Time Estimate:** 20 minutes  
**Why:** Better debugging and monitoring

#### **Files to Create:**

**1. `src/services/logger.ts`**

```typescript
import { config } from '@/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private isDevelopment = config.isDevelopment;

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry = this.formatMessage(level, message, context);

    // Console output in development
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      console[level](
        `%c[${level.toUpperCase()}]%c ${message}`,
        style,
        'color: inherit',
        context || ''
      );
    }

    // Send to external service in production
    if (config.features.errorTracking && level === 'error') {
      this.sendToErrorTracking(entry);
    }

    // Send to analytics
    if (config.features.analytics && (level === 'warn' || level === 'error')) {
      this.sendToAnalytics(entry);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #6B7280; font-weight: bold',
      info: 'color: #3B82F6; font-weight: bold',
      warn: 'color: #F59E0B; font-weight: bold',
      error: 'color: #EF4444; font-weight: bold',
    };
    return styles[level];
  }

  private sendToErrorTracking(entry: LogEntry) {
    // TODO: Integrate with Sentry, LogRocket, etc.
    // Example: Sentry.captureMessage(entry.message, { level: entry.level, extra: entry.context });
    console.log('[Error Tracking]', entry);
  }

  private sendToAnalytics(entry: LogEntry) {
    // TODO: Integrate with Google Analytics, Mixpanel, etc.
    // Example: analytics.track('error', { message: entry.message, ...entry.context });
    console.log('[Analytics]', entry);
  }

  public debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  public info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  public apiCall(method: string, url: string, status?: number) {
    this.info(`API ${method} ${url}`, { status });
  }

  public userAction(action: string, details?: Record<string, any>) {
    this.info(`User: ${action}`, details);
  }
}

export const logger = new Logger();
```

**2. Update `src/services/api/client.ts`**

Add logging to API client:

```typescript
import { logger } from '@/services/logger';

// In setupInterceptors()
this.client.interceptors.request.use(
  (config) => {
    logger.apiCall(config.method?.toUpperCase() || 'GET', config.url || '');
    // ... rest of code
  }
);

this.client.interceptors.response.use(
  (response) => {
    logger.apiCall(
      response.config.method?.toUpperCase() || 'GET',
      response.config.url || '',
      response.status
    );
    return response;
  },
  (error) => {
    logger.error('API Error', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });
    // ... rest of error handling
  }
);
```

**3. Update Error Boundary to use logger**

```typescript
import { logger } from '@/services/logger';

public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  logger.error('React Error Boundary', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });
}
```

---

### **Task 4: Add Query Key Management** 🔑

**Priority:** MEDIUM  
**Time Estimate:** 15 minutes  
**Why:** Centralized query key management prevents bugs

#### **Files to Update:**

**1. Update `src/lib/queryClient.ts`**

Add query key factory:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query Key Factory
export const queryKeys = {
  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },
  
  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (projectId?: string) => 
      [...queryKeys.tasks.lists(), projectId] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },
  
  // Issues
  issues: {
    all: ['issues'] as const,
    lists: () => [...queryKeys.issues.all, 'list'] as const,
    list: (projectId?: string) => 
      [...queryKeys.issues.lists(), projectId] as const,
    details: () => [...queryKeys.issues.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.issues.details(), id] as const,
  },
  
  // Milestones
  milestones: {
    all: ['milestones'] as const,
    lists: () => [...queryKeys.milestones.all, 'list'] as const,
    list: (projectId?: string) => 
      [...queryKeys.milestones.lists(), projectId] as const,
    details: () => [...queryKeys.milestones.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.milestones.details(), id] as const,
  },
  
  // Team
  team: {
    all: ['team'] as const,
    members: () => [...queryKeys.team.all, 'members'] as const,
    member: (id: string) => [...queryKeys.team.members(), id] as const,
  },
  
  // Modules
  modules: {
    all: ['modules'] as const,
    list: () => [...queryKeys.modules.all, 'list'] as const,
  },
} as const;
```

**2. Update all hooks to use centralized query keys**

Already done in your `useProjects.ts`, `useTasks.ts`, etc. ✅

---

### **Task 5: Add Loading States Component** ⏳

**Priority:** LOW  
**Time Estimate:** 15 minutes  
**Why:** Better UX during data fetching

#### **Files to Create:**

**1. `src/components/LoadingStates.tsx`**

```typescript
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
```

**2. Update `src/App.tsx`**

Use LoadingPage for Suspense fallback:

```typescript
import { LoadingPage } from '@/components/LoadingStates';

<Suspense fallback={<LoadingPage />}>
  <Routes>
    {/* routes */}
  </Routes>
</Suspense>
```

---

### **Task 6: Update Main App with All Providers** 🔌

**Priority:** HIGH  
**Time Estimate:** 10 minutes  
**Why:** Ensure all providers are properly configured

#### **Update `src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { config } from './config';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {config.features.devtools && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
```

#### **Update `src/App.tsx`**

```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingPage } from '@/components/LoadingStates';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// Lazy load pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Reports = lazy(() => import('@/pages/Reports'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Settings = lazy(() => import('@/pages/Settings'));

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingPage />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
```

---

## ✅ **Phase 1 Completion Checklist**

Use this checklist to track your progress:

### **Core Infrastructure**
- [x] Zustand stores created (projects, filters, user)
- [x] Service layer implemented (projects, tasks, issues)
- [x] React Query hooks created
- [x] Testing infrastructure setup
- [ ] Error boundaries added
- [ ] Environment configuration added
- [ ] Logging service implemented

### **Configuration**
- [ ] `.env.example` created
- [ ] `.env.development` created
- [ ] `.env.production` created
- [ ] `src/config/index.ts` created
- [ ] Services updated to use config

### **Developer Experience**
- [ ] Query key factory implemented
- [ ] Loading states components created
- [ ] Error boundary integrated in App.tsx
- [ ] React Query DevTools configured
- [ ] Logger integrated in services

### **Code Quality**
- [x] TypeScript types defined
- [x] Service layer abstraction
- [x] Optimistic updates in mutations
- [ ] Error handling in all services
- [ ] Logging in critical paths

---

## 🎯 **Success Criteria**

Phase 1 is complete when:

1. ✅ **Error Handling**
   - App doesn't crash on errors
   - User sees friendly error messages
   - Errors are logged for debugging

2. ✅ **Configuration**
   - Environment variables properly set
   - Easy to switch between mock/API data
   - Feature flags working

3. ✅ **Developer Experience**
   - Clear logging in console
   - React Query DevTools available
   - Easy to debug issues

4. ✅ **Code Organization**
   - Centralized query keys
   - Consistent error handling
   - Reusable loading states

---

## 📊 **Estimated Time to Complete**

| Task | Time | Priority |
|------|------|----------|
| Error Boundaries | 30 min | HIGH |
| Environment Config | 15 min | HIGH |
| Logging Service | 20 min | MEDIUM |
| Query Key Management | 15 min | MEDIUM |
| Loading States | 15 min | LOW |
| App Provider Setup | 10 min | HIGH |

**Total Time:** ~1.5 - 2 hours

---

## 🚀 **After Phase 1**

Once these tasks are complete, you'll have:

✅ **Production-ready foundation**  
✅ **Proper error handling**  
✅ **Environment management**  
✅ **Logging and monitoring**  
✅ **Great developer experience**  

**Then you can move to Phase 2: Feature-Based Restructuring!**

---

## 💡 **Tips for Implementation**

1. **Start with Error Boundaries** - Most impactful for stability
2. **Test each component** - Use the app and trigger errors intentionally
3. **Check console logs** - Ensure logging is working
4. **Verify environment variables** - Check that config is loaded correctly
5. **Use React Query DevTools** - Inspect cache and queries

---

## 📚 **Reference**

- **Full Implementation Guide:** `.agent/SCALABILITY_IMPLEMENTATION_PROMPT.md`
- **Architecture Status:** `.agent/ARCHITECTURE_STATUS.md`
- **This Document:** `.agent/PHASE_1_COMPLETION_TASKS.md`

---

**Ready to complete Phase 1? Start with Task 1: Error Boundaries!** 🚀
