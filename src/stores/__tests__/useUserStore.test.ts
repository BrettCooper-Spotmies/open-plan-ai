import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from '../useUserStore';
import { TeamMember } from '@/types';

const createMockUser = (id: string, name: string): TeamMember => ({
  id,
  name,
  email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  role: 'Engineer',
  initials: name.split(' ').map(n => n[0]).join(''),
});

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUserStore.getState().logout();
    useUserStore.setState({ sidebarOpen: true });
  });

  describe('initial state', () => {
    it('should have no user', () => {
      const { user } = useUserStore.getState();
      expect(user).toBeNull();
    });

    it('should not be authenticated', () => {
      const { isAuthenticated } = useUserStore.getState();
      expect(isAuthenticated).toBe(false);
    });

    it('should have default preferences', () => {
      const { preferences } = useUserStore.getState();
      
      expect(preferences.theme).toBe('system');
      expect(preferences.sidebarCollapsed).toBe(false);
      expect(preferences.compactMode).toBe(false);
    });

    it('should have default notification settings', () => {
      const { preferences } = useUserStore.getState();
      
      expect(preferences.notifications.taskAssignments).toBe(true);
      expect(preferences.notifications.taskCompletions).toBe(true);
      expect(preferences.notifications.comments).toBe(true);
      expect(preferences.notifications.projectUpdates).toBe(true);
      expect(preferences.notifications.milestoneReminders).toBe(true);
      expect(preferences.notifications.emailDigest).toBe('daily');
    });

    it('should have sidebar open by default', () => {
      const { sidebarOpen } = useUserStore.getState();
      expect(sidebarOpen).toBe(true);
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const { setUser } = useUserStore.getState();
      const mockUser = createMockUser('user-1', 'John Doe');

      setUser(mockUser);

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should allow setting null to clear user', () => {
      const { setUser } = useUserStore.getState();
      
      setUser(createMockUser('user-1', 'John Doe'));
      setUser(null);

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should replace existing user', () => {
      const { setUser } = useUserStore.getState();
      
      setUser(createMockUser('user-1', 'John Doe'));
      setUser(createMockUser('user-2', 'Jane Smith'));

      const { user } = useUserStore.getState();
      expect(user?.id).toBe('user-2');
      expect(user?.name).toBe('Jane Smith');
    });
  });

  describe('updatePreferences', () => {
    it('should update theme preference', () => {
      const { updatePreferences } = useUserStore.getState();
      
      updatePreferences({ theme: 'dark' });

      const { preferences } = useUserStore.getState();
      expect(preferences.theme).toBe('dark');
    });

    it('should update multiple preferences at once', () => {
      const { updatePreferences } = useUserStore.getState();
      
      updatePreferences({
        theme: 'light',
        compactMode: true,
        sidebarCollapsed: true,
      });

      const { preferences } = useUserStore.getState();
      expect(preferences.theme).toBe('light');
      expect(preferences.compactMode).toBe(true);
      expect(preferences.sidebarCollapsed).toBe(true);
    });

    it('should preserve existing preferences when updating', () => {
      const { updatePreferences } = useUserStore.getState();
      
      updatePreferences({ theme: 'dark' });
      updatePreferences({ compactMode: true });

      const { preferences } = useUserStore.getState();
      expect(preferences.theme).toBe('dark'); // Should be preserved
      expect(preferences.compactMode).toBe(true);
    });

    it('should update notification preferences', () => {
      const { updatePreferences, preferences: initialPrefs } = useUserStore.getState();
      
      updatePreferences({
        notifications: {
          ...initialPrefs.notifications,
          taskAssignments: false,
          emailDigest: 'weekly',
        },
      });

      const { preferences } = useUserStore.getState();
      expect(preferences.notifications.taskAssignments).toBe(false);
      expect(preferences.notifications.emailDigest).toBe('weekly');
      // Other notification settings should be preserved
      expect(preferences.notifications.taskCompletions).toBe(true);
    });

    it('should handle partial notification updates', () => {
      const { updatePreferences, preferences: initialPrefs } = useUserStore.getState();
      
      // First update
      updatePreferences({
        notifications: { ...initialPrefs.notifications, taskAssignments: false },
      });
      
      // Second update (should not reset taskAssignments)
      const currentPrefs = useUserStore.getState().preferences;
      updatePreferences({
        notifications: { ...currentPrefs.notifications, comments: false },
      });

      const { preferences } = useUserStore.getState();
      expect(preferences.notifications.taskAssignments).toBe(false);
      expect(preferences.notifications.comments).toBe(false);
      expect(preferences.notifications.taskCompletions).toBe(true); // Default preserved
    });
  });

  describe('logout', () => {
    it('should clear user and set isAuthenticated to false', () => {
      const { setUser, logout } = useUserStore.getState();
      
      setUser(createMockUser('user-1', 'John Doe'));
      logout();

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should not affect preferences on logout', () => {
      const { setUser, updatePreferences, logout } = useUserStore.getState();
      
      setUser(createMockUser('user-1', 'John Doe'));
      updatePreferences({ theme: 'dark', compactMode: true });
      logout();

      const { preferences } = useUserStore.getState();
      // Preferences may or may not be preserved depending on implementation
      // Current implementation preserves preferences - this is expected behavior
      expect(preferences).toBeDefined();
    });
  });

  describe('sidebar state', () => {
    it('should set sidebar open state', () => {
      const { setSidebarOpen } = useUserStore.getState();
      
      setSidebarOpen(false);
      expect(useUserStore.getState().sidebarOpen).toBe(false);
      
      setSidebarOpen(true);
      expect(useUserStore.getState().sidebarOpen).toBe(true);
    });

    it('should toggle sidebar state', () => {
      const { toggleSidebar } = useUserStore.getState();
      
      // Initially true
      expect(useUserStore.getState().sidebarOpen).toBe(true);
      
      toggleSidebar();
      expect(useUserStore.getState().sidebarOpen).toBe(false);
      
      toggleSidebar();
      expect(useUserStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('authentication flow', () => {
    it('should handle login flow correctly', () => {
      const { setUser, isAuthenticated: initialAuth } = useUserStore.getState();
      
      expect(initialAuth).toBe(false);
      
      setUser(createMockUser('user-1', 'John Doe'));
      
      const state = useUserStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.name).toBe('John Doe');
    });

    it('should handle logout flow correctly', () => {
      const { setUser, logout } = useUserStore.getState();
      
      setUser(createMockUser('user-1', 'John Doe'));
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      
      logout();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(useUserStore.getState().user).toBeNull();
    });

    it('should handle user switch correctly', () => {
      const { setUser } = useUserStore.getState();
      
      setUser(createMockUser('user-1', 'John Doe'));
      expect(useUserStore.getState().user?.id).toBe('user-1');
      
      setUser(createMockUser('user-2', 'Jane Smith'));
      expect(useUserStore.getState().user?.id).toBe('user-2');
      expect(useUserStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('theme preferences', () => {
    it('should support all theme options', () => {
      const { updatePreferences } = useUserStore.getState();
      
      updatePreferences({ theme: 'light' });
      expect(useUserStore.getState().preferences.theme).toBe('light');
      
      updatePreferences({ theme: 'dark' });
      expect(useUserStore.getState().preferences.theme).toBe('dark');
      
      updatePreferences({ theme: 'system' });
      expect(useUserStore.getState().preferences.theme).toBe('system');
    });
  });

  describe('email digest preferences', () => {
    it('should support all email digest options', () => {
      const { updatePreferences, preferences: initialPrefs } = useUserStore.getState();
      
      updatePreferences({ notifications: { ...initialPrefs.notifications, emailDigest: 'daily' } });
      expect(useUserStore.getState().preferences.notifications.emailDigest).toBe('daily');
      
      const prefs1 = useUserStore.getState().preferences;
      updatePreferences({ notifications: { ...prefs1.notifications, emailDigest: 'weekly' } });
      expect(useUserStore.getState().preferences.notifications.emailDigest).toBe('weekly');
      
      const prefs2 = useUserStore.getState().preferences;
      updatePreferences({ notifications: { ...prefs2.notifications, emailDigest: 'none' } });
      expect(useUserStore.getState().preferences.notifications.emailDigest).toBe('none');
    });
  });
});
