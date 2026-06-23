import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { bomService, type CreateNodeDto, type UpdateNodeDto } from '@/services/bom.service';
import { fromApiApproval } from '@/features/projects/components/bomData';

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

export function useApproveBomNode(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, comment }: { nodeId: string; comment?: string }) =>
      bomService.approveNode(nodeId, comment),
    onSuccess: (_data, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.summary(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.approvals(nodeId) });
    },
  });
}

export function useRejectBomNode(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, reason, comment }: { nodeId: string; reason: string; comment?: string }) =>
      bomService.rejectNode(nodeId, reason, comment),
    onSuccess: (_data, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.summary(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bom.approvals(nodeId) });
    },
  });
}

export function useBomNodeApprovals(nodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bom.approvals(nodeId ?? ''),
    queryFn:  async () => (await bomService.getNodeApprovals(nodeId!)).map(fromApiApproval),
    enabled:  !!nodeId,
  });
}
