import { ReactNode, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { useUserStore } from '@/stores/useUserStore';

interface AppLayoutProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function AppLayout({ children, noPadding }: AppLayoutProps) {
  const preferences = useUserStore((s) => s.preferences);

  // Apply compact mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.compactMode) {
      root.classList.add('compact');
    } else {
      root.classList.remove('compact');
    }
  }, [preferences.compactMode]);

  return (
    <SidebarProvider defaultOpen={!preferences.sidebarCollapsed}>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full min-w-0">
          <AppHeader />
          <main className={noPadding ? 'flex-1 overflow-hidden' : 'flex-1 p-6 overflow-y-auto'}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

