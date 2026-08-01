import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { assistantService, type CreateConversationInput } from '@/services/assistant.service';

export function useAssistantConversations() {
  return useQuery({
    queryKey: queryKeys.assistant.conversations(),
    queryFn: () => assistantService.listConversations(),
    staleTime: 30 * 1000,
  });
}

export function useCreateAssistantConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConversationInput) => assistantService.createConversation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assistant.conversations() });
    },
  });
}
