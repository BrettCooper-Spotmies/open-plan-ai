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
  imageUrl?: string;   // part photo, when the catalog entry has one — falls back to a category icon
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

/** Thin bar under the coverage pill — fill = remaining unallocated share of on-hand stock. */
export function CoverageBar({ status, record }: { status: CoverageStatus; record: StockRecord }) {
  const available = availableOf(record);
  if (available < 0) {
    const overRatio = Math.min(1, Math.abs(available) / Math.max(record.allocated, 1));
    return (
      <div className="flex h-1 w-full rounded-full overflow-hidden bg-muted mt-1.5">
        <div style={{ width: `${(1 - overRatio) * 100}%`, background: COVERAGE_META.conflict.fg }} />
        <div style={{ width: `${overRatio * 100}%`, background: COVERAGE_META['covered-by-order'].fg }} />
      </div>
    );
  }
  const pct = record.onHand > 0 ? Math.round((available / record.onHand) * 100) : 0;
  return (
    <div className="h-1 w-full rounded-full bg-muted overflow-hidden mt-1.5">
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: COVERAGE_META[status].fg }} />
    </div>
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
      imageUrl: r > 0.75 && r <= 0.9 ? `https://picsum.photos/seed/${encodeURIComponent(n.pn)}/400` : undefined,
    };
  });
}

export interface BuildLine {
  partId: string;
  pn: string;
  name: string;
  cat: BOMCategory;
  qtyPerUnit: number;
  uom: string;
  required: number;
  available: number;
  allocated: number;
  onOrder: number;
  leadTimeDays: number;
  status: CoverageStatus;
}

export interface Build {
  id: string;
  name: string;
  type: string;
  units: number;
  bomRev: string;
  scrapPct: number;
  linkedMilestone: string;
  targetDate: string;      // ISO
  projectedDate: string;   // ISO — target + longest-lead short line's lead time
  daysLate: number;        // 0 when clear to build
  lines: BuildLine[];
  readyCount: number;
  onOrderCount: number;
  shortLines: BuildLine[];
  longestLead: BuildLine | null;
}

const BUILD_DEFS = [
  { id: 'evt', name: 'EVT Build', type: 'EVT', units: 5, bomRev: 'Rev B', scrapPct: 5, milestone: 'EVT Complete' },
  { id: 'dvt', name: 'DVT Build', type: 'DVT', units: 25, bomRev: 'Rev C', scrapPct: 3, milestone: 'DVT Build Complete' },
  { id: 'pvt', name: 'PVT Build', type: 'PVT', units: 100, bomRev: 'Rev C', scrapPct: 2, milestone: 'PVT Kickoff' },
] as const;

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

/**
 * Builds one "Build" per fixed EVT/DVT/PVT phase, scaling each stocked part's real BOM
 * demand (qty-per-unit from demandByPartId) by that phase's unit count, then reusing
 * computeCoverage against the scaled requirement — so larger builds naturally show more
 * shortages against the same on-hand/on-order stock, same as a real MRP netting would.
 */
export function generateMockBuilds(stock: StockRecord[], demandByPartId: Map<string, number>): Build[] {
  const now = new Date();
  return BUILD_DEFS.map((def) => {
    const lines: BuildLine[] = stock.map((r) => {
      const qtyPerUnit = demandByPartId.get(r.partId) ?? 1;
      const required = qtyPerUnit * def.units;
      const status = computeCoverage(r, required);
      return {
        partId: r.partId, pn: r.pn, name: r.name, cat: r.cat,
        qtyPerUnit, uom: 'EA',
        required, available: availableOf(r), allocated: r.allocated, onOrder: r.onOrder,
        leadTimeDays: r.leadTimeDays, status,
      };
    });

    const readyCount = lines.filter(l => l.status === 'ready').length;
    const onOrderCount = lines.filter(l => l.status === 'covered-by-order').length;
    const shortLines = lines.filter(l => l.status === 'short' || l.status === 'conflict');
    const longestLead = shortLines.length
      ? shortLines.reduce((max, l) => (l.leadTimeDays > (max?.leadTimeDays ?? 0) ? l : max), null as BuildLine | null)
      : null;

    const daysLate = shortLines.length ? Math.round(30 + seededRandom(def.id) * 150) : 0;
    const projectedDate = addDays(now, longestLead?.leadTimeDays ?? 0);
    const targetDate = addDays(new Date(projectedDate), -daysLate);

    return {
      id: def.id, name: def.name, type: def.type, units: def.units,
      bomRev: def.bomRev, scrapPct: def.scrapPct, linkedMilestone: def.milestone,
      targetDate, projectedDate, daysLate,
      lines, readyCount, onOrderCount, shortLines, longestLead,
    };
  });
}
