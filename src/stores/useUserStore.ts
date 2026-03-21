import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TeamMember, UserSettings } from '@/types';

interface UserState {
  // Current user
  user: TeamMember | null;
  isAuthenticated: boolean;
  
  // User preferences
  preferences: UserSettings;
  
  // Actions
  setUser: (user: TeamMember | null) => void;
  updatePreferences: (prefs: Partial<UserSettings>) => void;
  logout: () => void;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const defaultPreferences: UserSettings = {
  theme: 'system',
  sidebarCollapsed: true,
  compactMode: false,
  notifications: {
    taskAssignments: true,
    taskCompletions: true,
    comments: true,
    projectUpdates: true,
    milestoneReminders: true,
    emailDigest: 'daily',
  },
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      preferences: defaultPreferences,
      sidebarOpen: false,
      
      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      updatePreferences: (prefs) => set((state) => ({
        preferences: { 
          ...state.preferences, 
          ...prefs,
          notifications: {
            ...state.preferences.notifications,
            ...(prefs.notifications || {}),
          },
        }
      })),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false 
      }),
      
      // UI state
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    { 
      name: 'user-store',
      partialize: (state) => ({
        // Do NOT persist `user` — it contains PII (email, role, avatar) and is
        // always re-populated from Supabase auth on session restore.
        preferences: state.preferences,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
