import type { TeamMember, Module, Milestone, Attachment } from '@/types';

export type { TeamMember, Module, Milestone };

export interface Project {
  id: string;
  name: string;
  description?: string;
  stage: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  orgId: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: TeamMember;
  members?: ProjectMember[];
  tasksCount?: number;
  completedTasksCount?: number;
  openIssuesCount?: number;
}

export interface ProjectMember {
  userId: string;
  role: 'lead' | 'member' | 'viewer';
  user: TeamMember;
  joinedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  stage?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  progress?: number;
}

export type ProjectFilter = {
  search?: string;
  stage?: string;
  sortBy?: 'name' | 'createdAt' | 'progress' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};
