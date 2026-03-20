import { describe, it, expect } from 'vitest';
import { getProjectSkeletonVariant, getSkeletonVariant } from './route-skeleton';

describe('Skeleton Routing Utilities', () => {
  describe('getProjectSkeletonVariant', () => {
    it('returns projects for base project routes', () => {
      expect(getProjectSkeletonVariant('/projects')).toBe('projects');
      expect(getProjectSkeletonVariant('/projects/')).toBe('projects');
    });

    it('returns detail for edit, new, and issue routes', () => {
      expect(getProjectSkeletonVariant('/projects/new')).toBe('detail');
      expect(getProjectSkeletonVariant('/projects/123/edit')).toBe('detail');
      expect(getProjectSkeletonVariant('/projects/123/issues/456')).toBe('detail');
    });

    it('returns project-detail for standard project ids', () => {
      expect(getProjectSkeletonVariant('/projects/123')).toBe('project-detail');
      expect(getProjectSkeletonVariant('/projects/abc-xyz')).toBe('project-detail');
      expect(getProjectSkeletonVariant('/projects/123/settings')).toBe('project-detail');
    });
  });

  describe('getSkeletonVariant', () => {
    it('returns correct base layout variants', () => {
      expect(getSkeletonVariant('/')).toBe('dashboard');
      expect(getSkeletonVariant('/dashboard')).toBe('dashboard');
      expect(getSkeletonVariant('/settings')).toBe('settings');
      expect(getSkeletonVariant('/my-day')).toBe('list');
      expect(getSkeletonVariant('/unknown-route')).toBe('default');
    });

    it('delegates project routes correctly to getProjectSkeletonVariant', () => {
      expect(getSkeletonVariant('/projects')).toBe('projects');
      expect(getSkeletonVariant('/projects/123')).toBe('project-detail');
      expect(getSkeletonVariant('/projects/123/edit')).toBe('detail');
    });
  });
});
