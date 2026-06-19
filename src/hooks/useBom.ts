import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { bomService, type CreateNodeDto, type UpdateNodeDto } from '@/services/bom.service';

export function useBomTree(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bom.tree(projectId ?? ''),
    queryFn:  () => bomService.getTree(projectId!),
    enabled:  !!projectId,
    staleTime: 30 * 1000,  // 30s — tree changes frequently during editing
  });
}

export function useBomSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bom.summary(projectId ?? ''),
    queryFn:  () => bomService.getSummary(projectId!),
    enabled:  !!projectId,
  });
}

export function useCreateBomNode(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateNodeDto) => bomService.createNode(projectId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.summary(projectId) });
    },
  });
}

export function useUpdateBomNode(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, dto }: { nodeId: string; dto: UpdateNodeDto }) =>
      bomService.updateNode(nodeId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.summary(projectId) });
    },
  });
}

export function useMoveBomNode(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, parentId, position }: { nodeId: string; parentId: string | null; position?: number }) =>
      bomService.moveNode(nodeId, { parentId, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
    },
  });
}

export function useDeleteBomNode(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => bomService.deleteNode(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.summary(projectId) });
    },
  });
}

export function useAddRequirement(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, requirementId }: { nodeId: string; requirementId: string }) =>
      bomService.addRequirement(nodeId, requirementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
    },
  });
}

export function useRemoveRequirement(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => bomService.removeRequirement(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
    },
  });
}
