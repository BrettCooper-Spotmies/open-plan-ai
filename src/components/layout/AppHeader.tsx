import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationsPopover } from './NotificationsPopover';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useIsMobile } from '@/hooks/use-mobile';

function getMobileHeaderTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/my-day')) return 'My Day';
  if (pathname.startsWith('/projects')) return 'Projects';
  if (pathname.startsWith('/calendar')) return 'Calendar';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/chat')) return 'Chat';
  if (pathname.startsWith('/team')) return 'Team';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  return 'Open Plan AI';
}

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile, signOut } = useAuth();
  const { theme, changeTheme } = useAppTheme();

  const mobileTitle = useMemo(
    () => getMobileHeaderTitle(location.pathname),
    [location.pathname],
  );

  const cycleTheme = () => {
    if (theme === 'system') changeTheme('light');
    else if (theme === 'light') changeTheme('dark');
    else changeTheme('system');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        {!isMobile && <SidebarTrigger className="-ml-1" />}

        {isMobile && (
          <h1 className="text-base font-semibold text-foreground leading-none">
            {mobileTitle}
          </h1>
        )}

      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={cycleTheme} title={`Theme: ${theme} (click to cycle)`}>
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : theme === 'light' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <NotificationsPopover />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.initials || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || 'user@example.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings?tab=general')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
