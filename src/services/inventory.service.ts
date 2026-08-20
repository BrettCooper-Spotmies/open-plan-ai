import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type { StockRecord, OrderRecord, StockTransaction, BuildDef } from '@/features/projects/components/inventoryData';

// ─── API response shapes (match backend inventory.types.ts responses) ─────────

export interface ApiStockRecord {
  id: string;
  partId: string;
  pn: string;
  name: string;
  cat: string;
  onHand: number;
  allocated: number;
  onOrder: number;
  location: string;
  leadTimeDays: number;
  lotNumber: string | null;
  serialNumber: string | null;
  quarantineQty: number;
}

export interface ApiOrderRecord {
  id: string;
  partId: string;
  pn: string;
  quantity: number;
  remainingQty: number;
  expectedDate: string;
  supplierRef: string | null;
  unitCost: number | null;
  location: string;
  status: 'open' | 'partially_received' | 'received' | 'cancelled';
  createdAt: string;
  createdBy: string;
}

export interface ApiStockTransaction {
  id: string;
  partId: string;
  type: 'receive' | 'adjust';
  direction: 'add' | 'remove' | null;
  qty: number;
  location: string;
  reference: string | null;
  reasonCode: string | null;
  note: string | null;
  quarantine: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ApiBuildDef {
  id: string;
  name: string;
  type: string;
  units: number;
  bomRev: string;
  scrapPct: number;
  milestone: string | null;
  targetDate: string | null;
}

// ─── Adapters ───────────────────────────────────────────────────────────────────

export function fromApiStock(r: ApiStockRecord): StockRecord {
  return {
    id: r.id,
    partId: r.partId,
    pn: r.pn,
    name: r.name,
    cat: r.cat,
    onHand: r.onHand,
    allocated: r.allocated,
    onOrder: r.onOrder,
    location: r.location,
    leadTimeDays: r.leadTimeDays,
    lotNumber: r.lotNumber ?? undefined,
    serialNumber: r.serialNumber ?? undefined,
    quarantineQty: r.quarantineQty || undefined,
  };
}

export function fromApiOrder(r: ApiOrderRecord): OrderRecord {
  return {
    id: r.id,
    partId: r.partId,
    pn: r.pn,
    quantity: r.quantity,
    remainingQty: r.remainingQty,
    expectedDate: r.expectedDate,
    supplierRef: r.supplierRef ?? undefined,
    unitCost: r.unitCost ?? undefined,
    location: r.location,
    status: r.status,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
  };
}

export function fromApiTransaction(r: ApiStockTransaction): StockTransaction {
  return {
    id: r.id,
    partId: r.partId,
    type: r.type,
    direction: r.direction ?? undefined,
    qty: r.qty,
    location: r.location,
    reference: r.reference ?? undefined,
    reasonCode: r.reasonCode ?? undefined,
    note: r.note ?? undefined,
    quarantine: r.quarantine,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
  };
}

export function fromApiBuild(r: ApiBuildDef): BuildDef {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    units: r.units,
    bomRev: r.bomRev,
    scrapPct: r.scrapPct,
    milestone: r.milestone ?? '',
    targetDate: r.targetDate ?? undefined,
  };
}

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export interface ReceiveStockDto {
  partId: string;
  location: string;
  quantity: number;
  reference?: string;
  quarantine: boolean;
  note?: string;
  orderId?: string;
  lotNumber?: string;
  serialNumber?: string;
}

export interface AdjustQuantityDto {
  partId: string;
  location: string;
  direction: 'add' | 'remove';
  quantity: number;
  reasonCode: string;
  note?: string;
  lotNumber?: string;
  serialNumber?: string;
}

export interface PlaceOrderDto {
  partId: string;
  quantity: number;
  expectedDate: string;
  supplierRef?: string;
  unitCost?: number;
  location: string;
}

export interface CreateBuildDto {
  name: string;
  type: string;
  units: number;
  bomRev: string;
  scrapPct: number;
  milestone?: string;
  targetDate?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────────

export const inventoryService = {
  async listStock(projectId: string): Promise<ApiStockRecord[]> {
    return apiClient.get<ApiStockRecord[]>(ENDPOINTS.INVENTORY.STOCK(projectId));
  },

  async listOrders(projectId: string): Promise<ApiOrderRecord[]> {
    return apiClient.get<ApiOrderRecord[]>(ENDPOINTS.INVENTORY.ORDERS(projectId));
  },

  async listTransactions(projectId: string): Promise<ApiStockTransaction[]> {
    return apiClient.get<ApiStockTransaction[]>(ENDPOINTS.INVENTORY.TRANSACTIONS(projectId));
  },

  async listBuilds(projectId: string): Promise<ApiBuildDef[]> {
    return apiClient.get<ApiBuildDef[]>(ENDPOINTS.INVENTORY.BUILDS(projectId));
  },

  async createBuild(projectId: string, dto: CreateBuildDto): Promise<ApiBuildDef> {
    return apiClient.post<ApiBuildDef>(ENDPOINTS.INVENTORY.BUILDS(projectId), dto);
  },

  async receiveStock(orgId: string, dto: ReceiveStockDto): Promise<ApiStockRecord> {
    return apiClient.post<ApiStockRecord>(ENDPOINTS.INVENTORY.RECEIVE(orgId), dto);
  },

  async adjustStock(orgId: string, dto: AdjustQuantityDto): Promise<ApiStockRecord> {
    return apiClient.post<ApiStockRecord>(ENDPOINTS.INVENTORY.ADJUST(orgId), dto);
  },

  async releaseQuarantine(orgId: string, stockId: string, qty: number): Promise<ApiStockRecord> {
    return apiClient.post<ApiStockRecord>(ENDPOINTS.INVENTORY.RELEASE_QUARANTINE(orgId, stockId), { qty });
  },

  async placeOrder(orgId: string, dto: PlaceOrderDto): Promise<ApiOrderRecord> {
    return apiClient.post<ApiOrderRecord>(ENDPOINTS.INVENTORY.PLACE_ORDER(orgId), dto);
  },
};
