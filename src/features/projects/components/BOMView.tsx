import { useState, useMemo, useCallback } from 'react';
import {
  Layers, Search, Filter, List, LayoutGrid, Share2,
  CheckCircle, Clock, DollarSign, ChevronRight, ChevronDown, Hash, X, User,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useBomTree, useCreateBomNode } from '@/hooks/useBom';
import { useCreatePart } from '@/hooks/useParts';
import { uploadBomDocumentFile, addBomDocumentLink } from '@/hooks/useBomDocuments';

async function saveBomDocs(nodeId: string, payload: BOMPartPayload) {
  const docs = [payload.docPhoto, ...(payload.docDatasheet ?? []), ...(payload.doc3DModel ?? []), ...(payload.docFootprint ?? [])].filter(Boolean) as DocValue[];
  await Promise.allSettled(
    docs.map(d => d.kind === 'file' ? uploadBomDocumentFile(nodeId, d.file) : addBomDocumentLink(nodeId, d.url, d.fileName)),
  );
}

function softTint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Owner initials helper (shared with detail screen)
function ownerInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
const OWNER_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#EA580C', '#4F46E5',
];
function ownerColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return OWNER_COLORS[Math.abs(h) % OWNER_COLORS.length];
}
function OwnerBadge({ name, size = 'sm' }: { name: string; size?: 'sm' | 'xs' }) {
  const sz = size === 'xs' ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[9px]';
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
        style={{ background: ownerColor(name) }}>
        {ownerInitials(name)}
      </span>
      <span className="text-xs text-muted-foreground truncate">{name}</span>
    </span>
  );
}
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BOMNode, BOMFilters, EMPTY_FILTERS,
  BOM_CAT_META,
  bomFlatAll, bomFlatten, bomFind,
  bomFilterTree, bomFlattenInclude, bomTypeOf,
  fromApiNode, assignLevelLabels,
} from './bomData';
import { BOMStatusPill, ReqTag, PartThumb } from './BOMShared';
import { BOMDetailScreen } from './BOMDetailScreen';
import { BOMMapView } from './BOMMapView';
import { BOMPartSheet, BOMPartPayload, DocValue } from './BOMPartSheet';
import { useCurrency } from '@/hooks/useCurrency';

// ── Skeletons ──────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-2.5 flex-1 min-w-0 border border-border flex items-center gap-2.5">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-10 mb-1.5" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
  );
}

function ListRowSkeleton({ level = 0 }: { level?: number }) {
  return (
    <div className="flex items-center px-6 border-b border-border" style={{ minWidth: 1200, height: 46 }}>
      <div style={{ flexBasis: 74, flexShrink: 0 }} className="flex items-center">
        <Skeleton className="h-3 w-6" style={{ marginLeft: level * 16 }} />
      </div>
      <div className="flex-1 min-w-0 px-2 flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-2.5 w-20 mb-1.5" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      </div>
      <div style={{ flexBasis: 50, flexShrink: 0 }} className="px-2 flex justify-end"><Skeleton className="h-3.5 w-6" /></div>
      <div style={{ flexBasis: 50, flexShrink: 0 }} className="px-2"><Skeleton className="h-3 w-8" /></div>
      <div style={{ flexBasis: 140, flexShrink: 0 }} className="px-2"><Skeleton className="h-3 w-20" /></div>
      <div style={{ flexBasis: 90, flexShrink: 0 }} className="px-2 flex justify-end"><Skeleton className="h-3.5 w-14" /></div>
      <div style={{ flexBasis: 74, flexShrink: 0 }} className="px-2"><Skeleton className="h-3 w-10" /></div>
      <div style={{ flexBasis: 50, flexShrink: 0 }} className="px-2"><Skeleton className="h-5 w-8 rounded" /></div>
      <div style={{ flexBasis: 92, flexShrink: 0 }} className="px-2"><Skeleton className="h-5 w-16 rounded-full" /></div>
      <div style={{ flexBasis: 140, flexShrink: 0 }} className="px-2 flex items-center gap-1.5">
        <Skeleton className="w-5 h-5 rounded-full shrink-0" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div style={{ flexBasis: 170, flexShrink: 0 }} className="px-2"><Skeleton className="h-5 w-16 rounded-full" /></div>
      <div style={{ flexBasis: 30, flexShrink: 0 }} />
    </div>
  );
}

function GridCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-2.5">
        <Skeleton className="w-full h-40 rounded-lg" />
      </div>
      <div className="px-3.5 pb-3.5 pt-0.5">
        <Skeleton className="h-2.5 w-24 mb-1.5" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-2 mb-3">
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
        </div>
        <Skeleton className="h-7 w-full rounded-md mb-3" />
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

const SKELETON_LEVELS = [0, 0, 1, 1, 2, 0, 1, 2];

function BOMViewSkeleton() {
  return (
    <div className="flex flex-col h-full px-6 overflow-hidden bg-background" style={{ height: 'calc(100vh - 220px)' }}>
      <div className="shrink-0 py-4">
        <div className="flex gap-3 mb-4">
          {[0, 1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="flex items-center gap-2.5 pb-0">
          <Skeleton className="h-8 w-72 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <div className="w-px h-5 bg-border" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
      </div>
      {/* Table header — real so column names are visible */}
      <div className="flex items-center px-6 border-b border-t border-border bg-muted/40" style={{ minWidth: 1200 }}>
        {HEADERS.map((c, i) => (
          <div key={c.key}
            style={{ flexBasis: c.w ?? 'auto', flexGrow: c.w ? 0 : 1, flexShrink: c.w ? 0 : 1 }}
            className={cn('py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider select-none',
              i === 0 ? 'pl-0 pr-2' : 'px-2'
            )}>
            {c.label}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-hidden border-t-0" style={{ minWidth: 1200 }}>
        {SKELETON_LEVELS.map((level, i) => <ListRowSkeleton key={i} level={level} />)}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconColor, accent }: {
  label: string; value: string; icon: React.ElementType;
  iconColor: string; accent?: boolean;
}) {
  return (
    <div className={cn('bg-card rounded-lg px-3.5 py-2.5 flex-1 min-w-0 border flex items-center gap-2.5', accent ? 'border-primary/25' : 'border-border')}>
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: softTint(iconColor, 0.12) }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight truncate" style={{ color: accent ? iconColor : undefined }}>
          {value}
        </span>
        <span className="block text-[11px] text-muted-foreground truncate">{label}</span>
      </span>
    </div>
  );
}

// ── Filter drawer ──────────────────────────────────────────────────
function FilterDrawer({ open, filters, setFilters, onClose, facets, currencySymbol }: {
  open: boolean; filters: BOMFilters;
  setFilters: React.Dispatch<React.SetStateAction<BOMFilters>>;
  onClose: () => void;
  facets: { units: string[]; manufacturers: string[]; suppliers: string[]; owners: string[] };
  currencySymbol: string;
}) {
  const [customMfrs, setCustomMfrs] = useState<string[]>([]);
  const [customSuppliers, setCustomSuppliers] = useState<string[]>([]);
  const [mfrInput, setMfrInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [showMfrInput, setShowMfrInput] = useState(false);
  const [showSupplierInput, setShowSupplierInput] = useState(false);

  if (!open) return null;

  const toggle = (key: 'units' | 'suppliers' | 'manufacturers' | 'statuses' | 'owners', val: string) =>
    setFilters(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(val)
        ? (f[key] as string[]).filter(x => x !== val)
        : [...(f[key] as string[]), val],
    }));
  const set = <K extends keyof BOMFilters>(key: K, val: BOMFilters[K]) =>
    setFilters(f => ({ ...f, [key]: val }));

  const addCustomMfr = () => {
    const v = mfrInput.trim();
    if (!v) return;
    if (!customMfrs.includes(v)) setCustomMfrs(m => [...m, v]);
    setFilters(f => ({
      ...f,
      manufacturers: f.manufacturers.includes(v) ? f.manufacturers : [...f.manufacturers, v],
    }));
    setMfrInput('');
    setShowMfrInput(false);
  };

  const addCustomSupplier = () => {
    const v = supplierInput.trim();
    if (!v) return;
    if (!customSuppliers.includes(v)) setCustomSuppliers(s => [...s, v]);
    setFilters(f => ({
      ...f,
      suppliers: f.suppliers.includes(v) ? f.suppliers : [...f.suppliers, v],
    }));
    setSupplierInput('');
    setShowSupplierInput(false);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="px-4 py-4 border-b border-border">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">{title}</div>
      {children}
    </div>
  );
  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap border transition-colors',
        active
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-card text-muted-foreground border-border hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
  const RangeInput = ({ value, onChange, placeholder, prefix }: {
    value: string; onChange: (v: string) => void; placeholder: string; prefix?: string;
  }) => (
    <div className="flex items-center gap-1.5 bg-muted border border-border rounded-md px-2.5 py-1.5 flex-1 min-w-0">
      {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-transparent border-none outline-none text-foreground text-xs w-full"
      />
    </div>
  );

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 z-[60]" />
      <div className="fixed top-0 right-0 bottom-0 w-[352px] bg-card border-l border-border z-[61] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Filters</span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Section title="Type of BOM">
            <div className="flex bg-muted border border-border rounded-lg p-0.5 gap-0.5">
              {([['all', 'All BOM'], ['top', 'Top Level'], ['catalog', 'Catalog']] as const).map(([id, label]) => (
                <button key={id} onClick={() => set('bomType', id)}
                  className={cn('flex-1 py-1.5 rounded-md text-xs font-medium cursor-pointer border-none transition-colors',
                    filters.bomType === id ? 'text-white' : 'bg-transparent text-muted-foreground hover:text-foreground')}
                  style={{ background: filters.bomType === id ? 'hsl(var(--foreground))' : undefined }}>
                  {label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Status">
            <div className="flex gap-2 flex-wrap">
              {(['approved', 'pending'] as const).map(s => (
                <Chip key={s} active={filters.statuses.includes(s)} onClick={() => toggle('statuses', s)}>
                  {s === 'approved' ? 'Approved' : 'Pending'}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title={`Unit Price (${currencySymbol})`}>
            <div className="flex items-center gap-2">
              <RangeInput value={filters.priceMin} onChange={v => set('priceMin', v)} placeholder="Min" prefix={currencySymbol} />
              <span className="text-muted-foreground text-xs">–</span>
              <RangeInput value={filters.priceMax} onChange={v => set('priceMax', v)} placeholder="Max" prefix={currencySymbol} />
            </div>
          </Section>

          <Section title="Lead Time (weeks)">
            <div className="flex items-center gap-2">
              <RangeInput value={filters.leadMin} onChange={v => set('leadMin', v)} placeholder="Min" />
              <span className="text-muted-foreground text-xs">–</span>
              <RangeInput value={filters.leadMax} onChange={v => set('leadMax', v)} placeholder="Max" />
            </div>
          </Section>

          <Section title="Units (UOM)">
            <div className="flex gap-2 flex-wrap">
              {facets.units.map(u => <Chip key={u} active={filters.units.includes(u)} onClick={() => toggle('units', u)}>{u}</Chip>)}
            </div>
          </Section>

          <Section title="Manufacturer">
            <div className="flex gap-2 flex-wrap">
              {[...facets.manufacturers, ...customMfrs.filter(c => !facets.manufacturers.includes(c))].map(m => (
                <Chip key={m} active={filters.manufacturers.includes(m)} onClick={() => toggle('manufacturers', m)}>{m}</Chip>
              ))}
              {showMfrInput ? (
                <div className="flex items-center gap-1 bg-muted border border-primary/40 rounded-md px-2 py-0.5">
                  <input
                    autoFocus
                    value={mfrInput}
                    onChange={e => setMfrInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCustomMfr(); if (e.key === 'Escape') { setShowMfrInput(false); setMfrInput(''); } }}
                    placeholder="Type name…"
                    className="bg-transparent border-none outline-none text-xs text-foreground w-24 placeholder:text-muted-foreground"
                  />
                  <button onClick={addCustomMfr} className="text-primary hover:text-primary/80 text-xs font-semibold">Add</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMfrInput(true)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span> Add
                </button>
              )}
            </div>
          </Section>

          <Section title="Supplier / Distributor">
            <div className="flex gap-2 flex-wrap">
              {[...facets.suppliers, ...customSuppliers.filter(c => !facets.suppliers.includes(c))].map(s => (
                <Chip key={s} active={filters.suppliers.includes(s)} onClick={() => toggle('suppliers', s)}>{s}</Chip>
              ))}
              {showSupplierInput ? (
                <div className="flex items-center gap-1 bg-muted border border-primary/40 rounded-md px-2 py-0.5">
                  <input
                    autoFocus
                    value={supplierInput}
                    onChange={e => setSupplierInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCustomSupplier(); if (e.key === 'Escape') { setShowSupplierInput(false); setSupplierInput(''); } }}
                    placeholder="Type name…"
                    className="bg-transparent border-none outline-none text-xs text-foreground w-24 placeholder:text-muted-foreground"
                  />
                  <button onClick={addCustomSupplier} className="text-primary hover:text-primary/80 text-xs font-semibold">Add</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSupplierInput(true)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span> Add
                </button>
              )}
            </div>
          </Section>

          <Section title="Owner / Handled By">
            <div className="flex gap-2 flex-wrap">
              {facets.owners.map(o => (
                <Chip key={o} active={filters.owners.includes(o)} onClick={() => toggle('owners', o)}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ background: ownerColor(o) }}>
                      {ownerInitials(o)}
                    </span>
                    {o.split(' ')[0]}
                  </span>
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Manufacturer Part Number (MPN)">
            <div className="flex items-center gap-2 bg-muted border border-border rounded-md px-2.5 py-1.5">
              <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                value={filters.mpn} onChange={e => set('mpn', e.target.value)}
                placeholder="e.g. INF-4A29C"
                className="bg-transparent border-none outline-none text-foreground text-xs w-full font-mono"
              />
            </div>
          </Section>
        </div>

        <div className="flex gap-2.5 px-4 py-3.5 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => setFilters({ ...EMPTY_FILTERS })}>Clear all</Button>
          <Button className="flex-1" onClick={onClose}>Show results</Button>
        </div>
      </div>
    </>
  );
}

// ── List view ──────────────────────────────────────────────────────
const HEADERS = [
  { key: 'level', label: 'Level', w: 74 },
  { key: 'part', label: 'Part', w: null },
  { key: 'qty', label: 'Qty', w: 50 },
  { key: 'uom', label: 'UOM', w: 50 },
  { key: 'mfr', label: 'Manufacturer', w: 140 },
  { key: 'price', label: 'Unit Price', w: 90 },
  { key: 'lead', label: 'Lead', w: 74 },
  { key: 'rev', label: 'Rev', w: 50 },
  { key: 'status', label: 'Status', w: 92 },
  { key: 'owner', label: 'Owner', w: 140 },
  { key: 'req', label: 'Traceability', w: 170 },
  { key: 'act', label: '', w: 30 },
] as const;

function ListView({ rows, expanded, toggle, filtersActive, onOpen, totalCount, formatCurrency }: {
  rows: BOMNode[];
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  filtersActive: boolean;
  onOpen: (id: string) => void;
  totalCount: number;
  formatCurrency: (n: number) => string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const rowH = 46;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto border-t border-border">
      {/* Header */}
      <div className="flex items-center px-6 border-b border-border bg-muted/40 sticky top-0 z-10" style={{ minWidth: 1200 }}>
        {HEADERS.map((c, i) => (
          <div key={c.key}
            style={{ flexBasis: c.w ?? 'auto', flexGrow: c.w ? 0 : 1, flexShrink: c.w ? 0 : 1 }}
            className={cn('py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider select-none',
              i === 0 ? 'pl-0 pr-2' : 'px-2',
              (c.key === 'qty' || c.key === 'price') && 'text-right'
            )}>
            {c.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ minWidth: 1200 }}>
        {rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Search className="w-7 h-7 mx-auto mb-3 opacity-30" />
            <div className="text-sm">No parts match your filters</div>
          </div>
        ) : rows.map(row => {
          const hasChildren = !!(row.children?.length);
          const isHovered = hovered === row.id;
          const isExp = filtersActive ? true : !!expanded[row.id];

          return (
            <div key={row.id}
              onMouseEnter={() => setHovered(row.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onOpen(row.id)}
              className="flex items-center px-6 border-b border-border cursor-pointer transition-colors"
              style={{
                height: rowH,
                background: isHovered ? 'var(--card)' : row.status === 'pending' ? 'rgba(245,158,11,0.03)' : 'transparent',
              }}
            >
              {/* Level */}
              <div style={{ flexBasis: 74, flexShrink: 0 }} className="flex items-center">
                <span
                  onClick={e => { e.stopPropagation(); if (hasChildren && !filtersActive) toggle(row.id); }}
                  className="inline-flex items-center p-0.5"
                  style={{ marginLeft: row.level * 16, cursor: hasChildren ? 'pointer' : 'default', flexShrink: 0 }}
                >
                  {hasChildren ? (
                    <span className="inline-flex transition-transform" style={{ transform: isExp ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      <ChevronDown className="w-3 h-3" />
                    </span>
                  ) : <span className="w-3 inline-block" />}
                </span>
                <span className={cn('text-xs font-semibold ml-0.5 tabular-nums',
                  row.level === 0 ? 'text-foreground' : row.level === 1 ? 'text-muted-foreground' : 'text-muted-foreground/60'
                )}>
                  {row.levelLabel ?? row.level}
                </span>
              </div>

              {/* Part */}
              <div className="flex-1 min-w-0 px-2 flex items-center gap-2.5">
                <PartThumb cat={row.cat} size={32} />
                <div className="min-w-0">
                  <span className="text-xs font-medium font-mono block" className="text-foreground">{row.pn}</span>
                  <span className={cn('text-sm block truncate',
                    row.level === 0 ? 'font-semibold text-foreground' : row.level === 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}>
                    {row.desc}
                  </span>
                </div>
              </div>

              {/* Qty */}
              <div style={{ flexBasis: 50, flexShrink: 0 }} className="px-2 text-sm text-foreground text-right tabular-nums">{row.qty}</div>
              {/* UOM */}
              <div style={{ flexBasis: 50, flexShrink: 0 }} className="px-2 text-xs text-muted-foreground">{row.uom}</div>
              {/* Manufacturer */}
              <div style={{ flexBasis: 140, flexShrink: 0 }} className="px-2 text-xs text-muted-foreground truncate">{row.manufacturer}</div>
              {/* Price */}
              <div style={{ flexBasis: 90, flexShrink: 0 }} className="px-2 text-sm text-foreground text-right tabular-nums">{formatCurrency(row.price)}</div>
              {/* Lead */}
              <div style={{ flexBasis: 74, flexShrink: 0 }} className="px-2 text-xs text-muted-foreground tabular-nums">{row.leadTime} wk</div>
              {/* Rev */}
              <div style={{ flexBasis: 50, flexShrink: 0 }} className="px-2">
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">{row.rev}</span>
              </div>
              {/* Status */}
              <div style={{ flexBasis: 92, flexShrink: 0 }} className="px-2"><BOMStatusPill status={row.status} /></div>
              {/* Owner */}
              <div style={{ flexBasis: 140, flexShrink: 0 }} className="px-2 min-w-0">
                <OwnerBadge name={row.owner} />
              </div>
              {/* Traceability */}
              <div style={{ flexBasis: 170, flexShrink: 0 }} className="px-2 flex gap-1 overflow-hidden flex-nowrap">
                {row.req.length === 0
                  ? <span className="text-[11px] text-muted-foreground">—</span>
                  : row.req.slice(0, 2).map(r => <ReqTag key={r} label={r} />)}
                {row.req.length > 2 && <span className="text-[11px] text-muted-foreground self-center">+{row.req.length - 2}</span>}
              </div>
              {/* Arrow */}
              <div style={{ flexBasis: 30, flexShrink: 0 }} className={cn('flex justify-center transition-opacity', isHovered ? 'opacity-100' : 'opacity-0')}>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground" style={{ minWidth: 1200 }}>
        <span>Showing {rows.length} of {totalCount} total parts</span>
        <span>Last updated Apr 23, 2026 · Rev C approved by Engineering</span>
      </div>
    </div>
  );
}

// ── Grid view ──────────────────────────────────────────────────────
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-xs font-medium text-foreground truncate">{value}</div>
    </div>
  );
}

function GridView({ rows, onOpen, totalCount, formatCurrency }: { rows: BOMNode[]; onOpen: (id: string) => void; totalCount: number; formatCurrency: (n: number) => string }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex-1 border-t border-border overflow-y-auto">
        <div className="py-16 text-center text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <div className="text-sm">No parts match your filters</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 border-t border-border overflow-y-auto">
      <div className="p-5 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))' }}>
        {rows.map(row => {
          const meta = BOM_CAT_META[row.cat] ?? BOM_CAT_META.assembly;
          const isH = hovered === row.id;
          return (
            <div
              key={row.id}
              onClick={() => onOpen(row.id)}
              onMouseEnter={() => setHovered(row.id)}
              onMouseLeave={() => setHovered(null)}
              className="bg-card border rounded-xl overflow-hidden cursor-pointer transition-all"
              style={{
                borderColor: isH ? 'hsl(var(--foreground) / 0.25)' : 'var(--border)',
                transform: isH ? 'translateY(-2px)' : undefined,
              }}
            >
              {/* Thumbnail */}
              <div className="relative p-2.5">
                <PartThumb cat={row.cat} big />
                <span className="absolute top-4 left-4 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', color: meta.tint, border: `1px solid ${meta.tint}40` }}>
                  {row.levelLabel ?? `L${row.level}`}
                </span>
                <span className="absolute top-4 right-4"><BOMStatusPill status={row.status} /></span>
              </div>
              {/* Body */}
              <div className="px-3.5 pb-3.5 pt-0.5">
                <div className="text-[11px] font-medium font-mono mb-1" className="text-foreground">{row.pn}</div>
                <div className="text-[13.5px] font-semibold text-foreground leading-snug mb-2.5 line-clamp-2 min-h-[35px]">
                  {row.desc}
                </div>
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 mb-2.5">
                  <Meta label="Qty" value={`${row.qty} ${row.uom}`} />
                  <Meta label="Unit Price" value={formatCurrency(row.price)} />
                  <Meta label="Manufacturer" value={row.manufacturer} />
                  <Meta label="Lead Time" value={`${row.leadTime} wk`} />
                </div>
                {/* Owner row */}
                <div className="flex items-center gap-1.5 mb-2.5 py-1.5 px-2 rounded-md bg-muted/40 border border-border/50">
                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">Owner</span>
                  <span className="ml-auto">
                    <OwnerBadge name={row.owner} size="xs" />
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-border">
                  <div className="flex gap-1 flex-wrap overflow-hidden">
                    {row.req.length === 0
                      ? <span className="text-[11px] text-muted-foreground">No traceability</span>
                      : row.req.slice(0, 2).map(r => <ReqTag key={r} label={r} />)}
                    {row.req.length > 2 && <span className="text-[11px] text-muted-foreground self-center">+{row.req.length - 2}</span>}
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 shrink-0">{row.rev}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-6 pb-5 text-xs text-muted-foreground">Showing {rows.length} of {totalCount} total parts</div>
    </div>
  );
}

// ── Main BOMView ───────────────────────────────────────────────────
type ViewMode = 'list' | 'grid' | 'map';

interface BOMViewProps {
  projectId: string;
  orgId: string;
  addOpen?: boolean;
  onAddClose?: () => void;
}

export function BOMView({ projectId, orgId, addOpen = false, onAddClose }: BOMViewProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('bom_view') as ViewMode) ?? 'list');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<BOMFilters>({ ...EMPTY_FILTERS });
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('bom_expanded');
    if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    return {};
  });

  const { formatCurrency, currencySymbol } = useCurrency();

  // ── Live API data ─────────────────────────────────────────────────
  const { data: bomTree, isLoading: treeLoading } = useBomTree(projectId);
  const createPart = useCreatePart(orgId);
  const createNode = useCreateBomNode(projectId);

  const rootNodes = useMemo(() => {
    if (!bomTree?.roots?.length) return [];
    const nodes = bomTree.roots.map(r => fromApiNode(r));
    assignLevelLabels(nodes);
    return nodes;
  }, [bomTree]);

  const allNodes = useMemo(() => bomFlatAll(rootNodes), [rootNodes]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('bom_expanded', JSON.stringify(next));
      return next;
    });
  };

  const handleView = (v: ViewMode) => { setView(v); localStorage.setItem('bom_view', v); };

  // ── Add Part handler (two-step: create part in catalog, then node) ─
  const handleAddPart = async (payload: BOMPartPayload) => {
    try {
      const part = await createPart.mutateAsync({
        partNumber:          payload.pn,
        description:         payload.desc,
        category:            payload.category,
        manufacturer:        payload.manufacturer || undefined,
        distributor:         payload.distributor  || undefined,
        mpn:                 payload.mpn          || undefined,
        unit:                payload.uom,
        initialStatus:       payload.status,
        initialRev:          payload.rev,
        initialPrice:        payload.price > 0 ? payload.price : undefined,
        initialLeadTimeDays: payload.leadTime > 0 ? payload.leadTime * 7 : undefined,
      });
      const node = await createNode.mutateAsync({
        partId:   part.id,
        quantity: payload.qty,
        unit:     payload.uom,
        status:   payload.status,
        ownerId:  payload.ownerId ?? null,
      });
      // Upload any documents attached in the form
      await saveBomDocs(node.id, payload);
      if (onAddClose) onAddClose();
    } catch {
      // errors are logged by React Query's MutationCache; no further action needed
    }
  };

  const facets = useMemo(() => ({
    units: [...new Set(allNodes.map(n => n.uom))].sort(),
    manufacturers: [...new Set(allNodes.map(n => n.manufacturer))].sort(),
    suppliers: [...new Set(allNodes.map(n => n.distributor))].sort(),
    owners: [...new Set(allNodes.map(n => n.owner))].sort(),
  }), [allNodes]);

  const activeCount =
    (filters.bomType !== 'all' ? 1 : 0) + filters.statuses.length + filters.units.length +
    filters.manufacturers.length + filters.suppliers.length +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.leadMin || filters.leadMax ? 1 : 0) +
    (filters.mpn ? 1 : 0);

  const pred = useCallback((row: BOMNode) => {
    const q = search.toLowerCase();
    if (q && !(row.pn.toLowerCase().includes(q) || row.desc.toLowerCase().includes(q) ||
      row.manufacturer.toLowerCase().includes(q) || row.mpn.toLowerCase().includes(q))) return false;
    if (filterStatus !== 'all' && row.status !== filterStatus) return false;
    if (filters.statuses.length && !filters.statuses.includes(row.status)) return false;
    if (filters.units.length && !filters.units.includes(row.uom)) return false;
    if (filters.manufacturers.length && !filters.manufacturers.includes(row.manufacturer)) return false;
    if (filters.suppliers.length && !filters.suppliers.includes(row.distributor)) return false;
    if (filters.owners.length && !filters.owners.includes(row.owner)) return false;
    if (filters.bomType !== 'all' && bomTypeOf(row) !== filters.bomType) return false;
    if (filters.mpn && !row.mpn.toLowerCase().includes(filters.mpn.toLowerCase())) return false;
    const pMin = parseFloat(filters.priceMin), pMax = parseFloat(filters.priceMax);
    if (!isNaN(pMin) && row.price < pMin) return false;
    if (!isNaN(pMax) && row.price > pMax) return false;
    const lMin = parseFloat(filters.leadMin), lMax = parseFloat(filters.leadMax);
    if (!isNaN(lMin) && row.leadTime < lMin) return false;
    if (!isNaN(lMax) && row.leadTime > lMax) return false;
    return true;
  }, [search, filterStatus, filters]);

  const filtersActive = !!search || filterStatus !== 'all' || activeCount > 0;

  const listRows = useMemo(() => {
    if (!filtersActive) return bomFlatten(rootNodes, expanded);
    return bomFlattenInclude(rootNodes, bomFilterTree(rootNodes, pred));
  }, [filtersActive, expanded, pred, rootNodes]);

  const gridRows = useMemo(() => allNodes.filter(pred), [allNodes, pred]);

  const totalCount    = bomTree?.totalNodes    ?? allNodes.length;
  const approvedCount = bomTree?.approvedCount ?? allNodes.filter(n => n.status === 'approved').length;
  const pendingCount  = bomTree?.pendingCount  ?? allNodes.filter(n => n.status === 'pending').length;
  const totalCost     = useMemo(() => allNodes.reduce((s, n) => s + n.price * n.qty, 0), [allNodes]);

  if (treeLoading) return <BOMViewSkeleton />;

  // Detail view
  if (selected) {
    const node = bomFind(selected, rootNodes);
    if (node) return (
      <BOMDetailScreen
        node={node}
        rootNodes={rootNodes}
        orgId={orgId}
        projectId={projectId}
        onBack={() => setSelected(null)}
        onNavigate={setSelected}
      />
    );
  }

  const Tab = ({ id, label }: { id: 'all' | 'approved' | 'pending'; label: string }) => (
    <button
      onClick={() => setFilterStatus(id)}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer border transition-colors',
        filterStatus === id
          ? 'bg-primary/10 text-primary border-primary/25'
          : 'text-muted-foreground border-transparent hover:text-foreground'
      )}
    >
      {label}
    </button>
  );

  const ViewBtn = ({ id, icon: Icon, label }: { id: ViewMode; icon: React.ElementType; label: string }) => {
    const active = view === id;
    return (
      <button
        onClick={() => handleView(id)}
        title={`${label} view`}
        className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border-none cursor-pointer transition-colors',
          active ? 'bg-card text-foreground shadow-sm' : 'bg-transparent text-muted-foreground hover:text-foreground')}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full px-6 overflow-hidden bg-background" style={{ height: 'calc(100vh - 220px)' }}>
      {/* ── Fixed header zone (no scroll) ─────────────────────────── */}
      <div className="shrink-0 py-4">
        {/* Stat cards */}
        <div className="flex gap-3 mb-4">
          <StatCard label="Total Parts" value={String(totalCount)} icon={Layers} iconColor="#2563EB" accent />
          <StatCard label="Approved" value={String(approvedCount)} icon={CheckCircle} iconColor="#16A34A" />
          <StatCard label="Pending Review" value={String(pendingCount)} icon={Clock} iconColor="#D97706" />
          <StatCard label="Total BOM Cost" value={formatCurrency(totalCost)} icon={DollarSign} iconColor="#9333EA" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2.5 pb-0">
          <div className="flex items-center gap-2 bg-muted border border-border rounded-md px-2.5 py-1.5 w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search parts, MPN, manufacturer…"
              className="bg-transparent border-none outline-none text-foreground text-sm w-full placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Tab id="all" label="All Parts" />
          <Tab id="approved" label="Approved" />
          <Tab id="pending" label="Pending" />

          <div className="flex-1" />

          {/* Filter button */}
          <button
            onClick={() => setFilterOpen(true)}
            className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border cursor-pointer transition-colors',
              activeCount ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-foreground border-border hover:bg-muted'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
            {activeCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-foreground text-background">
                {activeCount}
              </span>
            )}
          </button>

          <div className="w-px h-5 bg-border" />

          {/* View toggle */}
          <div className="flex bg-muted border border-border rounded-lg p-0.5 gap-0.5">
            <ViewBtn id="list" icon={List} label="List" />
            <ViewBtn id="grid" icon={LayoutGrid} label="Grid" />
            <ViewBtn id="map" icon={Share2} label="Map" />
          </div>
        </div>{/* end toolbar */}
      </div>{/* end header zone */}

      {/* ── Scrollable content (fills remaining height) ────────────── */}
      {view === 'list' && (
        <ListView
          rows={listRows}
          expanded={expanded}
          toggle={toggle}
          filtersActive={filtersActive}
          onOpen={setSelected}
          totalCount={totalCount}
          formatCurrency={formatCurrency}
        />
      )}
      {view === 'grid' && (
        <GridView rows={gridRows} onOpen={setSelected} totalCount={totalCount} formatCurrency={formatCurrency} />
      )}
      {view === 'map' && (
        <BOMMapView nodes={rootNodes} onOpen={setSelected} pred={pred} filtersActive={filtersActive} />
      )}
      <FilterDrawer
        open={filterOpen} filters={filters} setFilters={setFilters}
        onClose={() => setFilterOpen(false)} facets={facets}
        currencySymbol={currencySymbol}
      />

      {/* Add Part sheet */}
      <BOMPartSheet
        mode="add"
        projectId={projectId}
        open={addOpen}
        onClose={() => onAddClose?.()}
        onSave={handleAddPart}
      />
    </div>
  );
}
