import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  inventoryService,
  fromApiStock,
  fromApiOrder,
  fromApiTransaction,
  fromApiBuild,
  type ReceiveStockDto,
  type AdjustQuantityDto,
  type PlaceOrderDto,
  type CreateBuildDto,
} from '@/services/inventory.service';

export function useInventoryStock(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.stock(projectId ?? ''),
    queryFn:  async () => (await inventoryService.listStock(projectId!)).map(fromApiStock),
    enabled:  !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useInventoryOrders(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.orders(projectId ?? ''),
    queryFn:  async () => (await inventoryService.listOrders(projectId!)).map(fromApiOrder),
    enabled:  !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useInventoryTransactions(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.transactions(projectId ?? ''),
    queryFn:  async () => (await inventoryService.listTransactions(projectId!)).map(fromApiTransaction),
    enabled:  !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useInventoryBuilds(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.builds(projectId ?? ''),
    queryFn:  async () => (await inventoryService.listBuilds(projectId!)).map(fromApiBuild),
    enabled:  !!projectId,
  });
}

function invalidateInventory(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stock(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.orders(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transactions(projectId) });
}

export function useReceiveStock(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ReceiveStockDto) => inventoryService.receiveStock(orgId, dto),
    onSuccess: () => invalidateInventory(queryClient, projectId),
  });
}

export function useAdjustStock(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AdjustQuantityDto) => inventoryService.adjustStock(orgId, dto),
    onSuccess: () => invalidateInventory(queryClient, projectId),
  });
}

export function useReleaseQuarantine(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockId, qty }: { stockId: string; qty: number }) =>
      inventoryService.releaseQuarantine(orgId, stockId, qty),
    onSuccess: () => invalidateInventory(queryClient, projectId),
  });
}

export function usePlaceOrder(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: PlaceOrderDto) => inventoryService.placeOrder(orgId, dto),
    onSuccess: () => invalidateInventory(queryClient, projectId),
  });
}

export function useCreateInventoryBuild(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBuildDto) => inventoryService.createBuild(projectId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.builds(projectId) });
    },
  });
}
