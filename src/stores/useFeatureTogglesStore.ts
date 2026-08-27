import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sidebar sections that are opt-in via the Integrations page ("Features"
// cards) rather than always-on. A feature only shows up in the sidebar once
// the user has enabled it here.
export type ToggleableFeature = 'my-tasks' | 'calendar' | 'reports' | 'inventory';

interface FeatureTogglesState {
  enabled: Record<ToggleableFeature, boolean>;
  setFeatureEnabled: (feature: ToggleableFeature, enabled: boolean) => void;
}

export const useFeatureTogglesStore = create<FeatureTogglesState>()(
  persist(
    (set) => ({
      enabled: {
        'my-tasks': false,
        calendar: false,
        reports: false,
        inventory: false,
      },
      setFeatureEnabled: (feature, enabled) =>
        set((state) => ({
          enabled: { ...state.enabled, [feature]: enabled },
        })),
    }),
    {
      name: 'feature-toggles-store',
    }
  )
);
