import { ReactNode, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { useUserStore } from '@/stores/useUserStore';
import { useGlobalChatRealtime } from '@/features/chat/hooks/useGlobalChatRealtime';
import { usePresence } from '@/features/chat/hooks/usePresence';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
// Trigger HMR

interface AppLayoutProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function AppLayout({ children, noPadding }: AppLayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const preferences = useUserStore((s) => s.preferences);
  const updatePreferences = useUserStore((s) => s.updatePreferences);

  const { user } = useAuth();

  // Initialize global chat notifications and presence
  useGlobalChatRealtime();
  usePresence(user?.id);

  // Apply compact mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.compactMode) {
      root.classList.add('compact');
    } else {
      root.classList.remove('compact');
    }
  }, [preferences.compactMode]);

  const isConversationRoute = /^\/chat\/[^/]+/.test(location.pathname);
  const showAppHeader = !(isMobile && isConversationRoute);

  return (
    <SidebarProvider
      open={!preferences.sidebarCollapsed}
      onOpenChange={(open) => updatePreferences({ sidebarCollapsed: !open })}
    >
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full min-w-0 ml-4">
          {showAppHeader && <AppHeader />}
          <main className={noPadding ? 'flex-1 overflow-hidden' : 'flex-1 p-6 overflow-y-auto'}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

