import { useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, Users, Calendar, BarChart3, Zap, Sun } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
const mainNavItems = [{
  title: 'My Day',
  url: '/my-day',
  icon: Sun
}, {
  title: 'Dashboard',
  url: '/',
  icon: LayoutDashboard
}, {
  title: 'Projects',
  url: '/projects',
  icon: FolderKanban
}, {
  title: 'Calendar',
  url: '/calendar',
  icon: Calendar
}, {
  title: 'Reports',
  url: '/reports',
  icon: BarChart3
}];
const teamNavItems = [{
  title: 'Team',
  url: '/team',
  icon: Users
}, {
  title: 'Settings',
  url: '/settings',
  icon: Settings
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  return <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && <div className="flex flex-col">
              <span className="font-semibold text-sm text-sidebar-foreground">OpenPlan AI</span>
              <span className="text-xs text-muted-foreground">Hardware Development</span>
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-4">
            {!collapsed && 'Main'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={collapsed ? item.title : undefined}>
                    <NavLink to={item.url} end={item.url === '/'} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-4">
            {!collapsed && 'Workspace'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {teamNavItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={collapsed ? item.title : undefined}>
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && <div className="text-xs text-muted-foreground">© 2026 OpenPlanAI</div>}
      </SidebarFooter>
    </Sidebar>;
}