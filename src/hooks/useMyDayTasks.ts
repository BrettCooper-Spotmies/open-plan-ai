import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useProjects } from './useProjects';
import { getUserItems, MyDayItem } from '@/features/myday/utils/myDayUtils';
import { queryKeys } from '@/lib/queryClient';

/**
 * Fetch all tasks and issues assigned to the current user across all projects
 */
export function useMyDayTasks() {
    const { user } = useAuth();
    const { currentOrganization } = useOrganization();
    const { data: projects = [], isLoading: projectsLoading } = useProjects();

    return useQuery({
        queryKey: queryKeys.myDay.tasks(user?.id || ''),
        queryFn: (): MyDayItem[] => {
            if (!user?.id || !projects.length) return [];
            console.log('MyDay Debug - User ID:', user.id);
            console.log('MyDay Debug - Projects count:', projects.length);

            // Check issues in projects
            const allIssues = projects.flatMap(p => p.issues || []);
            console.log('MyDay Debug - Total issues found:', allIssues.length);
            if (allIssues.length > 0) {
                console.log('MyDay Debug - Sample issue assignees:', allIssues[0].assignees);
            }

            const items = getUserItems(projects, user.id);
            console.log('MyDay Debug - Filtered items for user:', items.length);
            console.log('MyDay Debug - Items by type:', {
                tasks: items.filter(i => i.itemType === 'task').length,
                issues: items.filter(i => i.itemType === 'issue').length
            });

            return items;
        },
        enabled: !!user?.id && !!currentOrganization && !projectsLoading,
        // Refetch when window regains focus
        refetchOnWindowFocus: true,
        // Refetch every 30 seconds to keep data fresh
        refetchInterval: 30000,
    });
}

/**
 * Get count of tasks and issues completed/resolved today
 */
export function useCompletedTodayCount() {
    const { user } = useAuth();
    const { data: projects = [] } = useProjects();

    return useQuery({
        queryKey: queryKeys.myDay.completedToday(user?.id || ''),
        queryFn: (): number => {
            if (!user?.id || !projects.length) return 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const allTasks = projects.flatMap(p => p.tasks);
            const allIssues = projects.flatMap(p => p.issues || []);

            // Count completed tasks
            const completedTasks = allTasks.filter(task => {
                const isAssignedToUser = task.assignees?.some(a => a.id === user.id);
                if (!isAssignedToUser) return false;

                if (task.status !== 'done') return false;

                if (!task.updatedAt) return false;
                const updatedDate = new Date(task.updatedAt);
                updatedDate.setHours(0, 0, 0, 0);

                return updatedDate.getTime() === today.getTime();
            }).length;

            // Count resolved issues
            const resolvedIssues = allIssues.filter(issue => {
                const isAssignedToUser = issue.assignees?.some(a => a.id === user.id);
                if (!isAssignedToUser) return false;

                if (issue.status !== 'resolved' && issue.status !== 'closed') return false;

                if (!issue.resolvedAt) return false;
                const resolvedDate = new Date(issue.resolvedAt);
                resolvedDate.setHours(0, 0, 0, 0);

                return resolvedDate.getTime() === today.getTime();
            }).length;

            return completedTasks + resolvedIssues;
        },
        enabled: !!user?.id,
        refetchOnWindowFocus: true,
        refetchInterval: 30000,
    });
}
