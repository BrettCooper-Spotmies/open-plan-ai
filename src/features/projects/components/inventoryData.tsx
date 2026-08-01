// Inventory (stock) types, mock data, and helpers.
//
// Parts themselves are real — see useOrgParts/useCreatePart in src/hooks/useParts.ts,
// backed by the org's actual Parts catalog. On-hand/allocated/location/ledger data below
// has no backend yet (confirmed nothing exists in either repo), so it follows the same
// "mock data only" precedent as requirementsData.ts: local types + a seed generator, with
// the ledger held in the InventoryView orchestrator's local state.

import { bomFlatAll, type BOMNode, type BOMCategory } from './bomData';

export const STOCK_LOCATIONS = ['Lab Shelf A', 'Lab Shelf B', 'Incoming Dock', 'CM', 'Quarantine'] as const;
export type StockLocation = typeof STOCK_LOCATIONS[number];

export type CoverageStatus = 'ready' | 'covered-by-order' | 'short' | 'conflict';

export interface StockRecord {
  id: string;
  partId: string;   // links to ApiPartResponse.id in the real Parts catalog
  pn: string;
  name: string;
  cat: BOMCategory;
  onHand: number;
  allocated: number;
  onOrder: number;
  location: StockLocation;
  leadTimeDays: number;
  lotSerial?: string;
  quarantineQty?: number;
}

export interface StockTransaction {
  id: string;
  partId: string;
  type: 'receive' | 'adjust';
  direction?: 'add' | 'remove';   // adjust only
  qty: number;
  location: StockLocation;
  reference?: string;              // receive only — PO / expected-receipt reference
  reasonCode?: string;             // adjust only
  note?: string;
  quarantine?: boolean;            // receive only
  createdAt: string;
  createdBy: string;
}

export const REASON_CODES = [
  'Cycle count correction',
  'Damaged / scrap',
  'Found stock',
  'Data entry error',
  'Returned to supplier',
  'Consumed outside system',
] as const;

export const availableOf = (r: StockRecord): number => r.onHand - r.allocated;

/**
 * demandQty is the BOM quantity-required for this part (from BOMNode.qty). Coverage is
 * "conflict" when more is allocated than on-hand (over-committed), "ready" when available
 * stock alone meets demand, "covered-by-order" when incoming on-order stock closes the gap,
 * else "short".
 */
export function computeCoverage(record: StockRecord, demandQty: number): CoverageStatus {
  const available = availableOf(record);
  if (available < 0) return 'conflict';
  if (available >= demandQty) return 'ready';
  if (available + record.onOrder >= demandQty) return 'covered-by-order';
  return 'short';
}

export const COVERAGE_META: Record<CoverageStatus, { label: string; bg: string; fg: string; border: string }> = {
  ready:              { label: 'Ready',            bg: 'rgba(34,197,94,0.1)',  fg: '#16A34A', border: 'rgba(34,197,94,0.2)' },
  'covered-by-order': { label: 'Covered by order', bg: 'rgba(245,158,11,0.1)', fg: '#D97706', border: 'rgba(245,158,11,0.2)' },
  short:              { label: 'Short',             bg: 'rgba(220,38,38,0.1)', fg: '#DC2626', border: 'rgba(220,38,38,0.2)' },
  conflict:           { label: 'Conflict',          bg: 'rgba(220,38,38,0.1)', fg: '#DC2626', border: 'rgba(220,38,38,0.2)' },
};

export function CoveragePill({ status }: { status: CoverageStatus }) {
  const meta = COVERAGE_META[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
      style={{ background: meta.bg, color: meta.fg, border: `1px solid ${meta.border}` }}
    >
      {meta.label}
    </span>
  );
}

// Deterministic pseudo-random spread seeded by part number, so seeded numbers stay stable
// across re-renders without needing a backend.
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/**
 * Seeds one stock row per unique part actually referenced in the project's BOM tree, so the
 * Inventory table reflects real BOM demand instead of starting empty on every project.
 */
export function generateMockStock(bomNodes: BOMNode[]): StockRecord[] {
  const seen = new Map<string, BOMNode>();
  for (const n of bomFlatAll(bomNodes)) {
    if (n._partId && n.pn && !seen.has(n._partId)) seen.set(n._partId, n);
  }

  const nonQuarantineLocations = STOCK_LOCATIONS.filter(l => l !== 'Quarantine');

  return Array.from(seen.values()).map((n) => {
    const r = seededRandom(n.pn);
    const demand = n.qty || 1;
    const onHand = Math.max(0, Math.round(demand * (0.5 + r * 3)));
    const allocated = Math.round(onHand * (r * 0.6));
    const onOrder = r > 0.7 ? Math.round(demand * r) : 0;
    const location = nonQuarantineLocations[Math.floor(r * nonQuarantineLocations.length)];

    return {
      id: `stk-${n._partId}`,
      partId: n._partId!,
      pn: n.pn,
      name: n.name,
      cat: n.cat,
      onHand,
      allocated,
      onOrder,
      location,
      leadTimeDays: n.leadTime || 14,
      quarantineQty: r > 0.9 ? Math.max(1, Math.round(onHand * 0.1)) : undefined,
      lotSerial: r > 0.8 && r <= 0.9 ? `LOT-${n.pn}-${Math.floor(r * 9000 + 1000)}` : undefined,
    };
  });
}
