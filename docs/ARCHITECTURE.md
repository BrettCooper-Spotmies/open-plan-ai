# Architecture Overview

This document describes the technical architecture of Open Plan AI.

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │  Features   │ │  Components │ │     Layout (Header,     ││
│  │  (Pages)    │ │  (Shared)   │ │     Sidebar)            ││
│  └──────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘│
└─────────┼───────────────┼────────────────────┼──────────────┘
          │               │                    │
          ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     State Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   Zustand   │ │ React Query │ │     Local State         ││
│  │   Stores    │ │   Cache     │ │     (useState)          ││
│  └──────┬──────┘ └──────┬──────┘ └─────────────────────────┘│
└─────────┼───────────────┼───────────────────────────────────┘
          │               │
          ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   API       │ │   Services  │ │     Monitoring          ││
│  │   Client    │ │  (Business) │ │     (Logger)            ││
│  └──────┬──────┘ └──────┬──────┘ └─────────────────────────┘│
└─────────┼───────────────┼───────────────────────────────────┘
          │               │
          ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │  REST API   │ │  Mock Data  │ │     Local Storage       ││
│  │  (Backend)  │ │  (Dev)      │ │     (Preferences)       ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
src/
├── components/           # Shared, reusable components
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # App shell components
│   ├── ErrorBoundary    # Error handling
│   └── SuspenseFallback # Loading states
│
├── features/            # Feature modules (domain-driven)
│   ├── dashboard/       # Dashboard & stats
│   ├── projects/        # Project management
│   ├── calendar/        # Calendar views
│   ├── myday/           # Daily task focus
│   ├── reports/         # Analytics & reporting
│   ├── settings/        # User preferences
│   └── team/            # Team management
│
├── hooks/               # Custom React hooks
│   ├── useProjects.ts   # Project data hook
│   ├── useTasks.ts      # Task data hook
│   └── useVirtualList   # Virtual scrolling
│
├── services/            # Business logic & API
│   ├── api/
│   │   ├── client.ts    # Axios instance
│   │   └── endpoints.ts # API routes
│   ├── monitoring/
│   │   └── logger.ts    # Logging service
│   └── *.service.ts     # Domain services
│
├── stores/              # Global state (Zustand)
│   ├── useProjectStore  # Project state
│   ├── useFilterStore   # Filter state
│   └── useUserStore     # User state
│
├── types/               # TypeScript definitions
│   └── index.ts         # Shared types
│
├── lib/                 # Utilities
│   ├── utils.ts         # Helper functions
│   └── queryClient.ts   # React Query config
│
├── workers/             # Web Workers
│   └── reportCalculations.worker.ts
│
└── test/                # Test utilities
    ├── setup.ts         # Vitest setup
    └── utils.tsx        # Test helpers
```

## 🔄 State Management Strategy

### Zustand Stores

For global application state that persists across routes:

```typescript
// stores/useProjectStore.ts
interface ProjectState {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
}));
```

### React Query

For server state with automatic caching and refetching:

```typescript
// hooks/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Local State

For component-specific UI state:

```typescript
// Within a component
const [isOpen, setIsOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
```

## 🎨 Feature Module Structure

Each feature follows a consistent structure:

```
features/<feature>/
├── <Feature>.tsx           # Main page component
├── index.ts                # Barrel exports
├── components/             # Feature-specific components
│   ├── <Component>.tsx
│   └── __tests__/
├── hooks/                  # Feature-specific hooks
├── utils/                  # Feature utilities
│   ├── <utils>.ts
│   └── __tests__/
└── types.ts                # Feature types (optional)
```

## 🚀 Performance Optimizations

### Code Splitting

Routes are lazy-loaded for faster initial load:

```typescript
const Reports = lazy(() => import('@/features/reports/Reports'));
const Calendar = lazy(() => import('@/features/calendar/Calendar'));
```

### Memoization

Expensive components use `React.memo`:

```typescript
export const TaskCard = memo(function TaskCard({ task }: TaskCardProps) {
  return <div>{task.title}</div>;
});
```

### Virtual Scrolling

Large lists use `@tanstack/react-virtual`:

```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
});
```

### Web Workers

Heavy calculations offloaded to workers:

```typescript
// Main thread
const worker = new Worker(new URL('./worker.ts', import.meta.url));
worker.postMessage({ type: 'CALCULATE', data });

// Worker thread
self.onmessage = (e) => {
  const result = heavyCalculation(e.data);
  self.postMessage(result);
};
```

## 🧪 Testing Strategy

### Unit Tests

Test pure functions and utilities:

```typescript
describe('calculateKPIs', () => {
  it('calculates completion rate correctly', () => {
    expect(calculateKPIs(tasks).completionRate).toBe(0.75);
  });
});
```

### Component Tests

Test component behavior:

```typescript
describe('TaskCard', () => {
  it('calls onComplete when checkbox clicked', async () => {
    const onComplete = vi.fn();
    render(<TaskCard task={task} onComplete={onComplete} />);
    
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onComplete).toHaveBeenCalledWith(task.id);
  });
});
```

### Integration Tests

Test feature workflows:

```typescript
describe('ProjectsFlow', () => {
  it('creates and displays new project', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('New Project'));
    // ...complete flow
  });
});
```

## 🔐 Error Handling

### Error Boundaries

Catch and display component errors:

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <RouteContent />
</ErrorBoundary>
```

### API Error Handling

Centralized in API client:

```typescript
client.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('API Error', { error: error.message });
    return Promise.reject(error);
  }
);
```

## 📊 Logging & Monitoring

Centralized logging service:

```typescript
import { logger } from '@/services/monitoring/logger';

// Usage
logger.info('User action', { action: 'click', target: 'submit' });
logger.error('API failed', { endpoint: '/projects', status: 500 });
logger.startPerformance('render');
// ... operation
logger.endPerformance('render');
```

## 🔧 Configuration

Environment-based configuration:

```typescript
// config/index.ts
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || '/api',
  },
  features: {
    useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
  },
};
```

## 📚 Related Documentation

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines
- [README.md](../README.md) - Quick start guide
- [PRD.md](../PRD.md) - Product requirements
