import { useMemo, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Sun, Moon, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationsPopover } from './NotificationsPopover';
import { useAppTheme } from '@/hooks/useAppTheme';
import { resolveFileUrl } from '@/utils/fileUrl';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { cn } from '@/lib/utils';

const stageColors: Record<string, string> = {
  concept: 'bg-muted text-muted-foreground',
  design: 'bg-chart-1/10 text-chart-1',
  development: 'bg-chart-2/10 text-chart-2',
  testing: 'bg-chart-4/10 text-chart-4',
  production: 'bg-chart-3/10 text-chart-3',
};

function getPageTitle(pathname: string): string {
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
  const { user: profile, signOut } = useAuth();
  const { theme, changeTheme } = useAppTheme();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Detect project detail route to show project name in header
  const projectMatch = useMatch('/projects/:id/*');
  const projectId = projectMatch?.params?.id;
  const { data: project } = useProjectDetail(projectId, { enabled: !!projectId });

  const pageTitle = useMemo(
    () => getPageTitle(location.pathname),
    [location.pathname],
  );

  const cycleTheme = () => {
    changeTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 min-w-0">

        {/* Project detail: Back + Name + Stage */}
        {project ? (
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/projects')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {project.name}
            </h1>
            <Badge
              variant="secondary"
              className={cn(stageColors[project.stage] ?? '', 'shrink-0')}
            >
              {project.stage.charAt(0).toUpperCase() + project.stage.slice(1)}
            </Badge>
          </div>
        ) : (
          <h1 className="text-2xl font-semibold text-foreground leading-none">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={cycleTheme} title={`Theme: ${theme} (click to cycle)`}>
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
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
                {profile?.avatarUrl && <AvatarImage src={resolveFileUrl(profile.avatarUrl) ?? profile.avatarUrl} alt={profile?.name || 'User'} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.initials || profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || profile?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.name || profile?.email?.split('@')[0] || 'User'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings?tab=general')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLogoutDialog(true)}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}