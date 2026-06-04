import { create } from 'zustand';
import type { ProjectFilter } from './types';

interface ProjectStore {
  activeProjectId: string | null;
  filters: ProjectFilter;
  selectedView: 'list' | 'kanban' | 'timeline';
  setActiveProject: (id: string | null) => void;
  setFilters: (f: Partial<ProjectFilter>) => void;
  resetFilters: () => void;
  setView: (v: ProjectStore['selectedView']) => void;
}

const defaultFilters: ProjectFilter = {
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

export const useProjectStore = create<ProjectStore>((set) => ({
  activeProjectId: null,
  filters: defaultFilters,
  selectedView: 'list',
  setActiveProject: (id) => set({ activeProjectId: id }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: defaultFilters }),
  setView: (selectedView) => set({ selectedView }),
}));
