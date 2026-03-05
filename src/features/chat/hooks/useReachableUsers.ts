import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/services/chat.service';
import { queryKeys } from '@/lib/queryClient';

export function useReachableUsers() {
    return useQuery({
        queryKey: ['chat', 'reachable-users'],
        queryFn: () => chatService.getReachableUsers(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
