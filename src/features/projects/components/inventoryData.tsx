// Inventory (stock) types, mock data, and helpers.
//
// Parts themselves are real — see useOrgParts/useCreatePart in src/hooks/useParts.ts,
// backed by the org's actual Parts catalog. On-hand/allocated/location/ledger data below
// has no backend yet (confirmed nothing exists in either repo), so it follows the same
// "mock data only" precedent as requirementsData.ts: local types + a seed generator, with
// the ledger held in the InventoryView orchestrator's local state.

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bomFlatAll, type BOMNode, type BOMCategory } from './bomData';

export const STOCK_LOCATIONS = ['Lab Shelf A', 'Lab Shelf B', 'Incoming Dock', 'CM', 'Quarantine'] as const;
// Locations are free-text (mirrors the BOMCategory custom-category pattern) — the presets
// above are just suggestions surfaced in pickers, not a closed set the hardware team is
// still deciding per-part-type constraints for.
export type StockLocation = string;

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
  lotNumber?: string;
  serialNumber?: string;
  quarantineQty?: number;
  imageUrl?: string;   // part photo, when the catalog entry has one — falls back to a category icon
}

export interface OrderRecord {
  id: string;
  partId: string;
  pn: string;
  quantity: number;
  remainingQty: number;
  expectedDate: string;   // ISO
  supplierRef?: string;
  unitCost?: number;
  location: string;
  status: 'open' | 'partially_received' | 'received' | 'cancelled';
  createdAt: string;
  createdBy: string;
}

const CUSTOM_LOCATION_SENTINEL = '__custom_location__';

/** Location picker: preset dropdown with a "custom" escape hatch — same pattern as
 * BOMCategory's free-text + preset-list combo (bomData.ts). */
export function LocationCombobox({ value, onChange, placeholder = 'Select a location...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [customMode, setCustomMode] = useState(
    () => value !== '' && !(STOCK_LOCATIONS as readonly string[]).includes(value)
  );

  useEffect(() => {
    if (value === '') setCustomMode(false);
  }, [value]);

  if (customMode) {
    return (
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom location..."
          autoFocus
        />
        <Button type="button" variant="outline" size="sm" onClick={() => { setCustomMode(false); onChange(''); }}>
          Presets
        </Button>
      </div>
    );
  }

  return (
    <Select
      onValueChange={(v) => {
        if (v === CUSTOM_LOCATION_SENTINEL) { setCustomMode(true); onChange(''); }
        else onChange(v);
      }}
      value={value}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {STOCK_LOCATIONS.map((loc) => (
          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
        ))}
        <SelectItem value={CUSTOM_LOCATION_SENTINEL}>Other (custom)…</SelectItem>
      </SelectContent>
    </Select>
  );
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

export const availableOf = (r: StockRecord): number => r.onHand - r.allocated - (r.quarantineQty ?? 0);

/** Sum of remaining qty across a part's open/partially-received orders — `onOrder` is
 * derived from real order state rather than a static seeded field. */
export function onOrderOf(orders: OrderRecord[], partId: string): number {
  return orders
    .filter(o => o.partId === partId && (o.status === 'open' || o.status === 'partially_received'))
    .reduce((sum, o) => sum + o.remainingQty, 0);
}

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
      lotNumber: r > 0.8 && r <= 0.9 ? `LOT-${n.pn}-${Math.floor(r * 9000 + 1000)}` : undefined,
      imageUrl: r > 0.75 && r <= 0.9 ? `https://picsum.photos/seed/${encodeURIComponent(n.pn)}/400` : undefined,
    };
  });
}

// Static fallback catalog shown whenever a project's BOM is empty (new project, no BOM
// imported yet, etc.) so Inventory never renders a totally blank table. Spans all seven
// known BOM categories with plausible EVSE (EV charger) hardware — same domain the category
// set (Charging Connectors, Power Electronics, ...) implies. Deterministic per-PN like
// generateMockStock, so numbers stay stable across re-renders.
const DEMO_PART_DEFS: { pn: string; name: string; cat: BOMCategory; demand: number; leadTime: number }[] = [
  { pn: 'ASM-1000', name: 'EVSE Charging Station Assembly', cat: 'assembly', demand: 1, leadTime: 21 },
  { pn: 'ASM-1010', name: 'Charging Cable Reel Assembly',   cat: 'assembly', demand: 1, leadTime: 18 },
  { pn: 'PWR-2001',  name: 'AC-DC Power Supply Module 3.3kW', cat: 'power', demand: 1, leadTime: 28 },
  { pn: 'PWR-2015',  name: 'Relay Contactor 32A',              cat: 'power', demand: 2, leadTime: 14 },
  { pn: 'PWR-2030',  name: 'EMI Filter Module',                cat: 'power', demand: 1, leadTime: 10 },
  { pn: 'CTL-3001',  name: 'Main Control PCB (ESP32)',         cat: 'control', demand: 1, leadTime: 35 },
  { pn: 'CTL-3012',  name: 'RS-485 Communication Module',      cat: 'control', demand: 1, leadTime: 12 },
  { pn: 'CTL-3020',  name: '4G/LTE Cellular Modem',            cat: 'control', demand: 1, leadTime: 40 },
  { pn: 'CON-4001',  name: 'Type 2 Charging Connector',        cat: 'connector', demand: 1, leadTime: 21 },
  { pn: 'CON-4010',  name: 'CCS Combo Connector',               cat: 'connector', demand: 1, leadTime: 30 },
  { pn: 'CON-4020',  name: 'Charging Cable 5m, 32A',            cat: 'connector', demand: 1, leadTime: 15 },
  { pn: 'ENC-5001',  name: 'IP65 Outdoor Enclosure',            cat: 'enclosure', demand: 1, leadTime: 25 },
  { pn: 'ENC-5010',  name: 'Mounting Bracket Kit',              cat: 'enclosure', demand: 1, leadTime: 9 },
  { pn: 'ENC-5020',  name: 'Cable Gland Set',                   cat: 'enclosure', demand: 4, leadTime: 7 },
  { pn: 'HMI-6001',  name: '7" Touch Display',                  cat: 'hmi', demand: 1, leadTime: 32 },
  { pn: 'HMI-6010',  name: 'Status LED Ring',                   cat: 'hmi', demand: 1, leadTime: 11 },
  { pn: 'HMI-6020',  name: 'RFID Card Reader',                  cat: 'hmi', demand: 1, leadTime: 20 },
  { pn: 'SAF-7001',  name: 'RCD Type B 30mA',                   cat: 'safety', demand: 1, leadTime: 17 },
  { pn: 'SAF-7010',  name: 'Surge Protection Device',           cat: 'safety', demand: 1, leadTime: 13 },
  { pn: 'SAF-7020',  name: 'Emergency Stop Button',             cat: 'safety', demand: 1, leadTime: 8 },
];

export function generateDemoStock(): StockRecord[] {
  const nonQuarantineLocations = STOCK_LOCATIONS.filter(l => l !== 'Quarantine');

  return DEMO_PART_DEFS.map((d) => {
    const r = seededRandom(d.pn);
    const onHand = Math.max(0, Math.round(d.demand * (0.5 + r * 3)));
    const allocated = Math.round(onHand * (r * 0.6));
    const onOrder = r > 0.7 ? Math.round(d.demand * r) : 0;
    const location = nonQuarantineLocations[Math.floor(r * nonQuarantineLocations.length)];

    return {
      id: `demo-${d.pn}`,
      partId: `demo-${d.pn}`,
      pn: d.pn,
      name: d.name,
      cat: d.cat,
      onHand,
      allocated,
      onOrder,
      location,
      leadTimeDays: d.leadTime,
      quarantineQty: r > 0.9 ? Math.max(1, Math.round(onHand * 0.1)) : undefined,
      lotNumber: r > 0.8 && r <= 0.9 ? `LOT-${d.pn}-${Math.floor(r * 9000 + 1000)}` : undefined,
    };
  });
}

/**
 * Seeds one open OrderRecord per stock row that already has demo `onOrder` > 0, so the
 * order/receive flow starts populated consistent with today's demo numbers instead of empty.
 */
export function generateMockOrders(stock: StockRecord[]): OrderRecord[] {
  const now = new Date();
  return stock
    .filter(r => r.onOrder > 0)
    .map(r => ({
      id: `ord-${r.partId}`,
      partId: r.partId,
      pn: r.pn,
      quantity: r.onOrder,
      remainingQty: r.onOrder,
      expectedDate: addDays(now, r.leadTimeDays),
      location: r.location,
      status: 'open' as const,
      createdAt: now.toISOString(),
      createdBy: 'Seed',
    }));
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

export interface BuildDef {
  id: string;
  name: string;
  type: string;
  units: number;
  bomRev: string;
  scrapPct: number;
  milestone: string;
  /** User-entered target date (new builds). Legacy seeded builds omit this and fall back to
   * a synthetic lateness offset so their numbers stay stable across re-renders. */
  targetDate?: string;
}

const BUILD_DEFS: BuildDef[] = [
  { id: 'evt', name: 'EVT Build', type: 'EVT', units: 5, bomRev: 'Rev B', scrapPct: 5, milestone: 'EVT Complete' },
  { id: 'dvt', name: 'DVT Build', type: 'DVT', units: 25, bomRev: 'Rev C', scrapPct: 3, milestone: 'DVT Build Complete' },
  { id: 'pvt', name: 'PVT Build', type: 'PVT', units: 100, bomRev: 'Rev C', scrapPct: 2, milestone: 'PVT Kickoff' },
];

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function diffDays(laterIso: string, earlierIso: string): number {
  return Math.round((new Date(laterIso).getTime() - new Date(earlierIso).getTime()) / 86400000);
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

/**
 * Computes one "Build" from a def, scaling each stocked part's real BOM demand (qty-per-unit
 * from demandByPartId) by the def's unit count, then reusing computeCoverage against the
 * scaled requirement — so larger builds naturally show more shortages against the same
 * on-hand/on-order stock, same as a real MRP netting would.
 */
export function buildFromDef(def: BuildDef, stock: StockRecord[], demandByPartId: Map<string, number>): Build {
  const now = new Date();
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

  const projectedDate = addDays(now, longestLead?.leadTimeDays ?? 0);

  let targetDate: string;
  let daysLate: number;
  if (def.targetDate) {
    targetDate = def.targetDate;
    daysLate = shortLines.length ? Math.max(0, diffDays(projectedDate, targetDate)) : 0;
  } else {
    daysLate = shortLines.length ? Math.round(30 + seededRandom(def.id) * 150) : 0;
    targetDate = addDays(new Date(projectedDate), -daysLate);
  }

  return {
    id: def.id, name: def.name, type: def.type, units: def.units,
    bomRev: def.bomRev, scrapPct: def.scrapPct, linkedMilestone: def.milestone,
    targetDate, projectedDate, daysLate,
    lines, readyCount, onOrderCount, shortLines, longestLead,
  };
}

export function generateMockBuilds(stock: StockRecord[], demandByPartId: Map<string, number>): Build[] {
  return BUILD_DEFS.map((def) => buildFromDef(def, stock, demandByPartId));
}
