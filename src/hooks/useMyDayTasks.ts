import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from './useProjects';
import { getUserItems, isCompletedToday } from '@/features/myday/utils/myDayUtils';

/**
 * Fetch all tasks and issues assigned to the current user across all projects
 */
export function useMyDayTasks() {
    const { user } = useAuth();
    const { data: projects = [], isLoading } = useProjects();

    const data = useMemo(() => {
        if (!user?.id || !projects.length) return [];
        return getUserItems(projects, user.id);
    }, [user?.id, projects]);

    return { data, isLoading };
}

/**
 * Get count of tasks and issues completed/resolved today
 */
export function useCompletedTodayCount() {
    const { user } = useAuth();
    const { data: projects = [] } = useProjects();

    const data = useMemo(() => {
        if (!user?.id || !projects.length) return 0;

        const allItems = getUserItems(projects, user.id);

        return allItems.filter(item =>
            (item.status === 'done' || item.status === 'resolved' || item.status === 'closed') &&
            isCompletedToday(item.originalTask || item.originalIssue)
        ).length;
    }, [user?.id, projects]);

    return { data };
}
