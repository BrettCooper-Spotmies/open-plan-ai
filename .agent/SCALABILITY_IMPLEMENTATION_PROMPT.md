# Scalability Implementation Guide for Open Plan AI

## Project Context
This is a React + TypeScript project management application built with Vite, shadcn/ui, and TailwindCSS. The current codebase uses basic React state management (useState, useMemo) without external state management libraries. We need to transform this into a production-ready, scalable architecture.

## Current Tech Stack
- **Frontend**: React 18.3.1 + TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19
- **UI Framework**: shadcn/ui (Radix UI components)
- **Styling**: TailwindCSS 3.4.17
- **Routing**: React Router DOM 6.30.1
- **Already Installed**: @tanstack/react-query 5.83.0, zod 3.25.76, react-hook-form 7.61.1

## Current Architecture Issues
1. No global state management (prop drilling everywhere)
2. No service layer (pages directly import mock data)
3. Flat folder structure (all components in one folder)
4. No testing infrastructure
5. Heavy calculations on main thread
6. No error boundaries
7. State doesn't persist across navigation

---

# IMPLEMENTATION TASKS

## PHASE 1: Foundation (High Priority)

### Task 1.1: Install Required Dependencies
```bash
npm install zustand immer
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npm install -D husky lint-staged
npm install axios
```

### Task 1.2: Setup Zustand State Management

**Create the following store files:**

#### `src/stores/useProjectStore.ts`
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Project, Task, Milestone } from '@/types';

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  selectProject: (projectId: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  addTask: (projectId: string, task: Task) => void;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      immer((set) => ({
        projects: [],
        selectedProjectId: null,
        isLoading: false,
        error: null,
        
        setProjects: (projects) => set({ projects }),
        selectProject: (projectId) => set({ selectedProjectId: projectId }),
        addProject: (project) => set((state) => {
          state.projects.push(project);
        }),
        updateProject: (projectId, updates) => set((state) => {
          const project = state.projects.find(p => p.id === projectId);
          if (project) {
            Object.assign(project, updates);
          }
        }),
        deleteProject: (projectId) => set((state) => {
          state.projects = state.projects.filter(p => p.id !== projectId);
        }),
        addTask: (projectId, task) => set((state) => {
          const project = state.projects.find(p => p.id === projectId);
          if (project) {
            project.tasks.push(task);
          }
        }),
        updateTask: (projectId, taskId, updates) => set((state) => {
          const project = state.projects.find(p => p.id === projectId);
          if (project) {
            const task = project.tasks.find(t => t.id === taskId);
            if (task) {
              Object.assign(task, updates);
            }
          }
        }),
        deleteTask: (projectId, taskId) => set((state) => {
          const project = state.projects.find(p => p.id === projectId);
          if (project) {
            project.tasks = project.tasks.filter(t => t.id !== taskId);
          }
        }),
      })),
      { name: 'project-store' }
    )
  )
);
```

#### `src/stores/useFilterStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ReportFilter } from '@/features/reports/types';

interface FilterState {
  reportFilters: ReportFilter;
  taskFilters: {
    status?: string[];
    priority?: string[];
    assigneeIds?: string[];
  };
  
  setReportFilters: (filters: Partial<ReportFilter>) => void;
  resetReportFilters: () => void;
  setTaskFilters: (filters: any) => void;
  resetTaskFilters: () => void;
}

const defaultReportFilters: ReportFilter = {
  timeRange: '30d',
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      reportFilters: defaultReportFilters,
      taskFilters: {},
      
      setReportFilters: (filters) => set((state) => ({
        reportFilters: { ...state.reportFilters, ...filters }
      })),
      resetReportFilters: () => set({ reportFilters: defaultReportFilters }),
      setTaskFilters: (filters) => set({ taskFilters: filters }),
      resetTaskFilters: () => set({ taskFilters: {} }),
    }),
    { name: 'filter-store' }
  )
);
```

#### `src/stores/useUserStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  defaultView: 'list' | 'board' | 'calendar';
  notifications: boolean;
}

interface UserState {
  user: any | null;
  preferences: UserPreferences;
  
  setUser: (user: any) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      preferences: {
        theme: 'system',
        sidebarCollapsed: false,
        defaultView: 'list',
        notifications: true,
      },
      
      setUser: (user) => set({ user }),
      updatePreferences: (prefs) => set((state) => ({
        preferences: { ...state.preferences, ...prefs }
      })),
      logout: () => set({ user: null }),
    }),
    { name: 'user-store' }
  )
);
```

### Task 1.3: Create Service Layer Architecture

**Create the following service files:**

#### `src/services/api/client.ts`
```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

#### `src/services/api/endpoints.ts`
```typescript
export const API_ENDPOINTS = {
  // Projects
  PROJECTS: '/projects',
  PROJECT_BY_ID: (id: string) => `/projects/${id}`,
  
  // Tasks
  TASKS: '/tasks',
  TASK_BY_ID: (id: string) => `/tasks/${id}`,
  PROJECT_TASKS: (projectId: string) => `/projects/${projectId}/tasks`,
  
  // Issues
  ISSUES: '/issues',
  ISSUE_BY_ID: (id: string) => `/issues/${id}`,
  
  // Reports
  REPORTS_KPI: '/reports/kpi',
  REPORTS_TRENDS: '/reports/trends',
  
  // Team
  TEAM_MEMBERS: '/team/members',
  TEAM_WORKLOAD: '/team/workload',
} as const;
```

#### `src/services/projects.service.ts`
```typescript
import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { Project, Task } from '@/types';
import { projects as mockProjects } from '@/data/mockData';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const projectsService = {
  async getAll(): Promise<Project[]> {
    if (USE_MOCK_DATA) {
      return Promise.resolve(mockProjects);
    }
    return apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS);
  },

  async getById(id: string): Promise<Project> {
    if (USE_MOCK_DATA) {
      const project = mockProjects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return Promise.resolve(project);
    }
    return apiClient.get<Project>(API_ENDPOINTS.PROJECT_BY_ID(id));
  },

  async create(project: Omit<Project, 'id'>): Promise<Project> {
    if (USE_MOCK_DATA) {
      const newProject = { ...project, id: `proj-${Date.now()}` } as Project;
      return Promise.resolve(newProject);
    }
    return apiClient.post<Project>(API_ENDPOINTS.PROJECTS, project);
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (USE_MOCK_DATA) {
      const project = mockProjects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return Promise.resolve({ ...project, ...updates });
    }
    return apiClient.patch<Project>(API_ENDPOINTS.PROJECT_BY_ID(id), updates);
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      return Promise.resolve();
    }
    return apiClient.delete(API_ENDPOINTS.PROJECT_BY_ID(id));
  },

  async getTasks(projectId: string): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      const project = mockProjects.find(p => p.id === projectId);
      return Promise.resolve(project?.tasks || []);
    }
    return apiClient.get<Task[]>(API_ENDPOINTS.PROJECT_TASKS(projectId));
  },
};
```

#### `src/services/tasks.service.ts`
```typescript
import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { Task } from '@/types';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const tasksService = {
  async create(projectId: string, task: Omit<Task, 'id'>): Promise<Task> {
    if (USE_MOCK_DATA) {
      const newTask = { ...task, id: `task-${Date.now()}` } as Task;
      return Promise.resolve(newTask);
    }
    return apiClient.post<Task>(API_ENDPOINTS.PROJECT_TASKS(projectId), task);
  },

  async update(taskId: string, updates: Partial<Task>): Promise<Task> {
    if (USE_MOCK_DATA) {
      return Promise.resolve(updates as Task);
    }
    return apiClient.patch<Task>(API_ENDPOINTS.TASK_BY_ID(taskId), updates);
  },

  async delete(taskId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      return Promise.resolve();
    }
    return apiClient.delete(API_ENDPOINTS.TASK_BY_ID(taskId));
  },
};
```

---

### Task 1.3B: Supabase Integration (Alternative to REST API)

> **IMPORTANT ARCHITECTURAL NOTE**: This application will initially use **Supabase** as the backend, with the flexibility to migrate to REST APIs in the future. The service layer pattern allows seamless switching between data sources without changing UI code.

#### **Architecture Pattern: Service Layer Abstraction**

```
UI Components → React Query Hooks → Service Layer → Backend (Supabase/REST/Mock)
     ↓                ↓                   ↓                    ↓
  (Display)      (Caching/State)    (Abstraction)      (Data Source)
```

**Key Principle**: 
- ❌ **NEVER** call Supabase directly from UI components or Zustand stores
- ✅ **ALWAYS** use the service layer as an abstraction
- ✅ Use environment variables to switch between data sources

---

#### **Step 1: Install Supabase Client**

```bash
npm install @supabase/supabase-js
```

#### **Step 2: Setup Supabase Client**

Create `src/services/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from './types'; // Generated types from Supabase CLI

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'open-plan-ai',
    },
  },
});

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): never {
  console.error('Supabase error:', error);
  throw new Error(error.message || 'An unexpected error occurred');
}
```

#### **Step 3: Generate TypeScript Types from Supabase**

```bash
# Install Supabase CLI
npm install -D supabase

# Login to Supabase
npx supabase login

# Generate types (run this whenever your database schema changes)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/services/supabase/types.ts
```

#### **Step 4: Create Supabase-Aware Service Layer**

Update `src/services/projects.service.ts` to support **three data sources**:

```typescript
import { supabase, handleSupabaseError } from './supabase/client';
import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { Project, Task } from '@/types';
import { projects as mockProjects } from '@/data/mockData';

// Environment flags to control data source
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const projectsService = {
  /**
   * Get all projects
   * Supports: Mock Data, Supabase, REST API
   */
  async getAll(): Promise<Project[]> {
    // 1. Mock data (for development without backend)
    if (USE_MOCK_DATA) {
      return Promise.resolve(mockProjects);
    }

    // 2. Supabase (current implementation)
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (*),
          milestones (*),
          issues (*)
        `)
        .order('created_at', { ascending: false });

      if (error) handleSupabaseError(error);
      return data as Project[];
    }

    // 3. REST API (future implementation)
    return apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS);
  },

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project> {
    if (USE_MOCK_DATA) {
      const project = mockProjects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return Promise.resolve(project);
    }

    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (*),
          milestones (*),
          issues (*)
        `)
        .eq('id', id)
        .single();

      if (error) handleSupabaseError(error);
      return data as Project;
    }

    return apiClient.get<Project>(API_ENDPOINTS.PROJECT_BY_ID(id));
  },

  /**
   * Create new project
   */
  async create(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    if (USE_MOCK_DATA) {
      const newProject = { 
        ...project, 
        id: `proj-${Date.now()}`,
        created_at: new Date().toISOString()
      } as Project;
      return Promise.resolve(newProject);
    }

    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();

      if (error) handleSupabaseError(error);
      return data as Project;
    }

    return apiClient.post<Project>(API_ENDPOINTS.PROJECTS, project);
  },

  /**
   * Update existing project
   */
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (USE_MOCK_DATA) {
      const project = mockProjects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return Promise.resolve({ ...project, ...updates });
    }

    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) handleSupabaseError(error);
      return data as Project;
    }

    return apiClient.patch<Project>(API_ENDPOINTS.PROJECT_BY_ID(id), updates);
  },

  /**
   * Delete project
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      return Promise.resolve();
    }

    if (USE_SUPABASE) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) handleSupabaseError(error);
      return;
    }

    return apiClient.delete(API_ENDPOINTS.PROJECT_BY_ID(id));
  },

  /**
   * Get tasks for a project
   */
  async getTasks(projectId: string): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      const project = mockProjects.find(p => p.id === projectId);
      return Promise.resolve(project?.tasks || []);
    }

    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) handleSupabaseError(error);
      return data as Task[];
    }

    return apiClient.get<Task[]>(API_ENDPOINTS.PROJECT_TASKS(projectId));
  },

  /**
   * Subscribe to real-time changes (Supabase-specific feature)
   * Falls back gracefully if not using Supabase
   */
  subscribeToChanges(callback: (payload: any) => void) {
    if (!USE_SUPABASE) {
      console.warn('Real-time subscriptions only available with Supabase');
      return { unsubscribe: () => {} };
    }

    const subscription = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'projects' 
        },
        (payload) => {
          console.log('Real-time update:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  },
};
```

#### **Step 5: Update Environment Variables**

Update `.env.example`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_DATA=false
VITE_USE_SUPABASE=true

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false

# App Configuration
VITE_APP_NAME=Open Plan AI
VITE_APP_VERSION=1.0.0
```

Create `.env.development`:

```env
# Development: Use Supabase
VITE_USE_MOCK_DATA=false
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create `.env.production`:

```env
# Production: Can switch to REST API in future
VITE_USE_MOCK_DATA=false
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# When migrating to REST API, change to:
# VITE_USE_SUPABASE=false
# VITE_API_BASE_URL=https://api.yourapp.com
```

#### **Step 6: Create Authentication Service (Supabase)**

Create `src/services/auth.service.ts`:

```typescript
import { supabase, handleSupabaseError } from './supabase/client';
import { User } from '@supabase/supabase-js';

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

export const authService = {
  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, metadata?: any): Promise<User> {
    if (!USE_SUPABASE) {
      throw new Error('Authentication requires Supabase');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) handleSupabaseError(error);
    if (!data.user) throw new Error('Failed to create user');
    
    return data.user;
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    if (!USE_SUPABASE) {
      throw new Error('Authentication requires Supabase');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) handleSupabaseError(error);
    if (!data.user) throw new Error('Failed to sign in');
    
    return data.user;
  },

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!USE_SUPABASE) return;

    const { error } = await supabase.auth.signOut();
    if (error) handleSupabaseError(error);
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (!USE_SUPABASE) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    if (!USE_SUPABASE) {
      return { unsubscribe: () => {} };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(session?.user ?? null);
      }
    );

    return subscription;
  },
};
```

---

#### **Benefits of This Architecture**

1. ✅ **Flexibility**: Switch between Supabase ↔ REST API ↔ Mock Data with one env variable
2. ✅ **Type Safety**: Full TypeScript support across all layers
3. ✅ **Testability**: Easy to mock the service layer in tests
4. ✅ **Separation of Concerns**: UI doesn't know about Supabase
5. ✅ **Real-time Support**: Supabase subscriptions work seamlessly
6. ✅ **Future-Proof**: Easy migration path to REST APIs
7. ✅ **No Vendor Lock-in**: Not tied to Supabase forever

---

#### **Migration Path**

**Current (Supabase):**
```
UI → useProjects() → projectsService → Supabase
```

**Future (REST API):**
```
UI → useProjects() → projectsService → REST API
```

**Your UI code doesn't change at all!** Just flip the environment variable.

---

### Task 1.4: Setup React Query Integration

#### `src/lib/queryClient.ts`
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

#### `src/hooks/useProjects.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services/projects.service';
import { useProjectStore } from '@/stores/useProjectStore';
import { Project } from '@/types';
import { useEffect } from 'react';

export const QUERY_KEYS = {
  PROJECTS: ['projects'],
  PROJECT: (id: string) => ['projects', id],
  PROJECT_TASKS: (id: string) => ['projects', id, 'tasks'],
};

/**
 * Fetch all projects with real-time updates (if using Supabase)
 */
export function useProjects() {
  const queryClient = useQueryClient();
  const setProjects = useProjectStore((state) => state.setProjects);

  const query = useQuery({
    queryKey: QUERY_KEYS.PROJECTS,
    queryFn: async () => {
      const projects = await projectsService.getAll();
      setProjects(projects);
      return projects;
    },
  });

  // Subscribe to real-time changes (Supabase only)
  useEffect(() => {
    const subscription = projectsService.subscribeToChanges((payload) => {
      console.log('Project changed:', payload);
      // Refetch projects when data changes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return query;
}

/**
 * Fetch single project by ID
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PROJECT(projectId),
    queryFn: () => projectsService.getById(projectId),
    enabled: !!projectId,
  });
}

/**
 * Create new project with optimistic updates
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const addProject = useProjectStore((state) => state.addProject);

  return useMutation({
    mutationFn: (project: Omit<Project, 'id'>) => projectsService.create(project),
    onSuccess: (newProject) => {
      addProject(newProject);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    },
  });
}

/**
 * Update project with optimistic updates
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const updateProject = useProjectStore((state) => state.updateProject);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      projectsService.update(id, updates),
    // Optimistic update
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.PROJECT(id) });
      const previous = queryClient.getQueryData(QUERY_KEYS.PROJECT(id));
      
      queryClient.setQueryData(QUERY_KEYS.PROJECT(id), (old: any) => ({
        ...old,
        ...updates,
      }));

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          QUERY_KEYS.PROJECT(variables.id),
          context.previous
        );
      }
    },
    onSuccess: (updatedProject) => {
      updateProject(updatedProject.id, updatedProject);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT(updatedProject.id) });
    },
  });
}

/**
 * Delete project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const deleteProject = useProjectStore((state) => state.deleteProject);

  return useMutation({
    mutationFn: (projectId: string) => projectsService.delete(projectId),
    onSuccess: (_, projectId) => {
      deleteProject(projectId);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    },
  });
}
```

### Task 1.5: Update Main App to Use React Query

#### Update `src/main.tsx`
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

### Task 1.6: Create Error Boundaries

#### `src/components/ErrorBoundary.tsx`
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs font-mono text-muted-foreground">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <Button onClick={this.handleReset} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Task 1.7: Add Environment Variables

#### Create `.env.example`
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_DATA=true

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false

# App Configuration
VITE_APP_NAME=Open Plan AI
VITE_APP_VERSION=1.0.0
```

#### Create `.env.development`
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_DATA=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
```

---

## PHASE 2: Feature-Based Restructuring

### Task 2.1: Reorganize Folder Structure

**Move files to feature-based structure:**

```
src/
├── features/
│   ├── reports/
│   │   ├── components/
│   │   │   ├── ReportsHeader.tsx
│   │   │   ├── ReportsFilters.tsx
│   │   │   ├── ReportsKPIRow.tsx
│   │   │   ├── ReportTaskStatusChart.tsx
│   │   │   ├── ReportMilestoneHealth.tsx
│   │   │   ├── ReportTeamWorkload.tsx
│   │   │   ├── ReportModuleProgress.tsx
│   │   │   ├── ReportOpenIssuesTable.tsx
│   │   │   └── ReportTrendChart.tsx
│   │   ├── hooks/
│   │   │   ├── useReportData.ts
│   │   │   └── useReportFilters.ts
│   │   ├── utils/
│   │   │   └── reportsUtils.ts
│   │   ├── types.ts
│   │   ├── Reports.tsx (page)
│   │   └── index.ts
│   ├── projects/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── tasks/
│   ├── calendar/
│   └── settings/
├── shared/
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── layout/
│   │   └── common/
│   ├── hooks/
│   ├── utils/
│   └── types/
├── services/
├── stores/
└── lib/
```

**Create barrel exports for each feature:**

#### `src/features/reports/index.ts`
```typescript
export { default as Reports } from './Reports';
export * from './types';
export * from './hooks/useReportData';
export * from './hooks/useReportFilters';
```

### Task 2.2: Update Imports in App.tsx

```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';

// Lazy load features
const Reports = lazy(() => import('@/features/reports'));
const Projects = lazy(() => import('@/features/projects'));
const Calendar = lazy(() => import('@/features/calendar'));
const Settings = lazy(() => import('@/features/settings'));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/reports" element={<Reports />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
```

---

## PHASE 3: Testing Infrastructure

### Task 3.1: Setup Vitest Configuration

#### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### `src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

#### `src/test/utils.tsx`
```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

### Task 3.2: Add Example Tests

#### `src/features/reports/__tests__/reportsUtils.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { calculateKPIs, getTaskStatusBreakdown } from '../utils/reportsUtils';
import { Task } from '@/types';

describe('reportsUtils', () => {
  describe('calculateKPIs', () => {
    it('should calculate project progress correctly', () => {
      const tasks: Task[] = [
        { id: '1', status: 'done' } as Task,
        { id: '2', status: 'done' } as Task,
        { id: '3', status: 'in-progress' } as Task,
        { id: '4', status: 'todo' } as Task,
      ];

      const kpis = calculateKPIs(tasks, [], { start: new Date(), end: new Date() });

      expect(kpis.totalTasks).toBe(4);
      expect(kpis.completedTasks).toBe(2);
      expect(kpis.projectProgress).toBe(50);
    });
  });

  describe('getTaskStatusBreakdown', () => {
    it('should group tasks by status', () => {
      const tasks: Task[] = [
        { id: '1', status: 'done' } as Task,
        { id: '2', status: 'done' } as Task,
        { id: '3', status: 'in-progress' } as Task,
      ];

      const breakdown = getTaskStatusBreakdown(tasks);

      expect(breakdown).toEqual([
        { status: 'done', count: 2 },
        { status: 'in-progress', count: 1 },
      ]);
    });
  });
});
```

#### `src/features/reports/__tests__/ReportsKPIRow.test.tsx`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ReportsKPIRow } from '../components/ReportsKPIRow';
import { ReportKPI } from '../utils/reportsUtils';

describe('ReportsKPIRow', () => {
  const mockKPIs: ReportKPI = {
    projectProgress: 75,
    totalTasks: 100,
    completedTasks: 75,
    openIssues: 5,
    criticalIssues: 2,
    overdueTasks: 3,
    avgCycleTime: 4.5,
  };

  it('should render all KPI cards', () => {
    render(<ReportsKPIRow kpis={mockKPIs} />);

    expect(screen.getByText('Project Progress')).toBeInTheDocument();
    expect(screen.getByText('Open Issues')).toBeInTheDocument();
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('Avg Cycle Time')).toBeInTheDocument();
  });

  it('should display correct values', () => {
    render(<ReportsKPIRow kpis={mockKPIs} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should call onClick handler when KPI card is clicked', async () => {
    const handleClick = vi.fn();
    const { user } = render(<ReportsKPIRow kpis={mockKPIs} onKPIClick={handleClick} />);

    const progressCard = screen.getByText('Project Progress').closest('div');
    await user.click(progressCard!);

    expect(handleClick).toHaveBeenCalledWith('progress');
  });
});
```

### Task 3.3: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

---

## PHASE 4: Performance Optimizations

### Task 4.1: Add Web Worker for Heavy Calculations

#### `src/workers/reportCalculations.worker.ts`
```typescript
import { Task, Issue } from '@/types';

export interface WorkerMessage {
  type: 'CALCULATE_KPI' | 'FILTER_TASKS';
  payload: any;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'CALCULATE_KPI': {
      const { tasks, issues, dateRange } = payload;
      const result = calculateKPIs(tasks, issues, dateRange);
      self.postMessage({ type: 'CALCULATE_KPI_RESULT', payload: result });
      break;
    }
    case 'FILTER_TASKS': {
      const { tasks, filter } = payload;
      const result = filterTasks(tasks, filter);
      self.postMessage({ type: 'FILTER_TASKS_RESULT', payload: result });
      break;
    }
  }
};

function calculateKPIs(tasks: Task[], issues: Issue[], dateRange: any) {
  // Heavy calculation logic here
  // ... (move from reportsUtils.ts)
}

function filterTasks(tasks: Task[], filter: any) {
  // Heavy filtering logic here
  // ... (move from reportsUtils.ts)
}
```

#### `src/hooks/useReportWorker.ts`
```typescript
import { useEffect, useRef, useState } from 'react';
import { Task, Issue } from '@/types';
import { ReportKPI } from '@/features/reports/types';

export function useReportWorker() {
  const workerRef = useRef<Worker>();
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/reportCalculations.worker.ts', import.meta.url),
      { type: 'module' }
    );

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const calculateKPIs = (
    tasks: Task[],
    issues: Issue[],
    dateRange: any
  ): Promise<ReportKPI> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return;

      setIsCalculating(true);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'CALCULATE_KPI_RESULT') {
          setIsCalculating(false);
          resolve(e.data.payload);
          workerRef.current?.removeEventListener('message', handleMessage);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({
        type: 'CALCULATE_KPI',
        payload: { tasks, issues, dateRange },
      });
    });
  };

  return { calculateKPIs, isCalculating };
}
```

### Task 4.2: Add Virtual Scrolling for Large Lists

#### Install dependency:
```bash
npm install @tanstack/react-virtual
```

#### Example usage in task list:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function TaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // estimated row height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TaskRow task={tasks[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## PHASE 5: Additional Improvements

### Task 5.1: Add Logging Service

#### `src/services/monitoring/logger.ts`
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.isDevelopment) {
      console[level](message, context);
    }

    // TODO: Send to external logging service in production
    // Example: Sentry, LogRocket, Datadog
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
```

### Task 5.2: Add Husky Pre-commit Hooks

#### Setup Husky:
```bash
npx husky-init && npm install
```

#### `.husky/pre-commit`
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run type-check
npm run test -- --run
```

#### `package.json` - Add lint-staged:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### Task 5.3: Update TypeScript Config for Strict Mode

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting - STRICT MODE */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## MIGRATION CHECKLIST

### Phase 1 - Foundation 
- [ ] Install all required dependencies
- [ ] Create Zustand stores (project, filter, user)
- [ ] Setup service layer (API client, endpoints, services)
- [ ] Integrate React Query hooks
- [ ] Add Error Boundaries
- [ ] Setup environment variables
- [ ] Update main.tsx with providers

### Phase 2 - Restructuring 
- [ ] Create feature-based folder structure
- [ ] Move Reports feature to new structure
- [ ] Move Projects feature to new structure
- [ ] Move Calendar feature to new structure
- [ ] Move Settings feature to new structure
- [ ] Update all imports
- [ ] Add lazy loading to routes

### Phase 3 - Testing 
- [ ] Setup Vitest configuration
- [ ] Create test utilities
- [ ] Write unit tests for utils
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Setup coverage reporting
- [ ] Add test scripts to package.json

### Phase 4 - Performance 
- [ ] Implement Web Workers for calculations
- [ ] Add virtual scrolling to large lists
- [ ] Add React.memo to expensive components
- [ ] Optimize re-renders with useCallback
- [ ] Add code splitting
- [ ] Performance profiling

### Phase 5 - Polish 
- [ ] Add logging service
- [ ] Setup Husky pre-commit hooks
- [ ] Enable TypeScript strict mode
- [ ] Fix all type errors
- [ ] Add JSDoc comments
- [ ] Update documentation

---

## SUCCESS CRITERIA

After implementation, the codebase should have:

1. ✅ **Zero prop drilling** - All global state in Zustand stores
2. ✅ **Service layer** - Complete abstraction from data source
3. ✅ **Feature-based structure** - Easy to navigate and scale
4. ✅ **70%+ test coverage** - Confidence in refactoring
5. ✅ **Type-safe** - Strict TypeScript with no `any` types
6. ✅ **Performant** - No UI jank with large datasets
7. ✅ **Error handling** - Graceful degradation
8. ✅ **Developer experience** - Fast feedback loops with tests and linting

---

## NOTES FOR AI CODING ASSISTANT

- Maintain existing UI/UX - only change architecture
- Keep all existing features working
- Preserve shadcn/ui component usage
- Don't break existing routes
- Ensure backward compatibility during migration
- Test each phase before moving to next
- Use the existing mock data structure
- Follow existing naming conventions
- Keep components small and focused
- Document any breaking changes

---

## ADDITIONAL RESOURCES

- Zustand docs: https://docs.pmnd.rs/zustand
- React Query docs: https://tanstack.com/query/latest
- Vitest docs: https://vitest.dev
- Testing Library: https://testing-library.com
- Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
