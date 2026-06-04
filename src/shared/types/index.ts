export type ID = string;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDelete extends Timestamps {
  deletedAt?: string;
}

export interface Author {
  id: ID;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  description?: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export type Theme = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: Theme;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  notifications: {
    taskAssignments: boolean;
    taskCompletions: boolean;
    comments: boolean;
    projectUpdates: boolean;
    milestoneReminders: boolean;
    emailDigest: 'none' | 'daily' | 'weekly';
  };
}

export type { TaskStatus, Priority, ModuleType, ProjectStage } from '@/types';
