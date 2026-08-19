import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Table as TableIcon, LayoutGrid, Download, Pencil, PackageSearch,
  AlertTriangle, Truck, CheckCircle, Lock, Boxes as BoxesIcon, Layers, SlidersHorizontal, ShoppingCart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBomTree } from '@/hooks/useBom';
import { useOrgParts } from '@/hooks/useParts';
import {
  fromApiNode, applyPriceRollup, assignLevelLabels, bomFlatAll, formatLeadTime,
  KNOWN_BOM_CATEGORIES, getCategoryMeta, type BOMCategory,
} from './bomData';
import {
  generateMockStock, generateDemoStock, generateMockBuilds, generateMockOrders, buildFromDef, computeCoverage, availableOf, onOrderOf,
  CoveragePill, CoverageBar,
  type StockRecord, type StockTransaction, type CoverageStatus, type OrderRecord, type BuildDef,
} from './inventoryData';
import { HoverZoomImage, PartThumb } from './BOMShared';
import { ReceiveStockDialog, type ReceiveStockInput } from './ReceiveStockDialog';
import { AdjustQuantityDialog, type AdjustQuantityInput } from './AdjustQuantityDialog';
import { PlaceOrderDialog, type PlaceOrderInput } from './PlaceOrderDialog';
import { PartDetailSheet, type WhereUsedRow } from './PartDetailSheet';
import { BuildsPanel } from './BuildsPanel';
import { AlertsPanel } from './AlertsPanel';
import type { NewBuildInput } from './NewBuildDialog';

const STAT_TOOLTIPS: Record<string, string> = {
  'On Hand': 'Physical quantity currently in stock, including anything held in quarantine.',
  'Allocated': 'Quantity already reserved against BOM demand for planned builds.',
  'Available': 'On Hand minus Allocated minus Quarantine — what can actually be used right now.',
  'On Order': 'Quantity remaining on open purchase orders, not yet received.',
};

function HeaderTip({ label }: { label: string }) {
  const tip = STAT_TOOLTIPS[label];
  if (!tip) return <>{label}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted underline-offset-2">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

function softTint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function StatCard({ label, value, icon: Icon, iconColor, accent }: {
  label: string; value: string; icon: React.ElementType;
  iconColor: string; accent?: boolean;
}) {
  return (
    <div className={cn('bg-card rounded-lg px-3.5 py-2.5 flex-1 min-w-[140px] border flex items-center gap-2.5', accent ? 'border-primary/25' : 'border-border')}>
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

interface InventoryViewProps {
  projectId: string;
  orgId: string;
}

type QuickFilter = 'all' | 'low-coverage' | 'on-order' | 'lot-serial' | 'quarantine';

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'All parts' },
  { value: 'low-coverage', label: 'Low coverage' },
  { value: 'on-order', label: 'On order' },
  { value: 'lot-serial', label: 'Lot / serial' },
  { value: 'quarantine', label: 'Quarantine' },
];

export function InventoryView({ projectId, orgId }: InventoryViewProps) {
  const isMobile = useIsMobile();
  const { data: bomTree } = useBomTree(projectId);
  const { data: partsResult } = useOrgParts(orgId);
  const parts = useMemo(() => partsResult?.data ?? [], [partsResult]);

  const rootNodes = useMemo(() => {
    if (!bomTree) return [];
    const nodes = bomTree.roots.map(r => applyPriceRollup(fromApiNode(r)));
    assignLevelLabels(nodes);
    return nodes;
  }, [bomTree]);

  const demandByPartId = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of bomFlatAll(rootNodes)) {
      if (!n._partId) continue;
      map.set(n._partId, (map.get(n._partId) ?? 0) + n.qty);
    }
    return map;
  }, [rootNodes]);

  const [stock, setStock] = useState<StockRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (rootNodes.length > 0) {
      const seeded = generateMockStock(rootNodes);
      setStock(seeded);
      setOrders(generateMockOrders(seeded));
      seededRef.current = true;
    } else if (bomTree) {
      // BOM tree has loaded but has no parts yet — show the static demo catalog instead
      // of an empty table, so Inventory always has something to preview.
      const seeded = generateDemoStock();
      setStock(seeded);
      setOrders(generateMockOrders(seeded));
      seededRef.current = true;
    }
  }, [rootNodes, bomTree]);

  // `onOrder` is derived from live order state rather than the static seeded field, so
  // Receive/Order actions are reflected immediately without touching stock rows directly.
  const displayStock = useMemo(
    () => stock.map(r => ({ ...r, onOrder: onOrderOf(orders, r.partId) })),
    [stock, orders]
  );

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const handleReceive = (input: ReceiveStockInput) => {
    setStock(prev => {
      const existing = prev.find(r => r.partId === input.partId && r.location === input.location);
      if (existing) {
        return prev.map(r => r.id === existing.id
          ? {
            ...r,
            onHand: r.onHand + input.quantity,
            quarantineQty: input.quarantine ? (r.quarantineQty ?? 0) + input.quantity : r.quarantineQty,
            lotNumber: input.lotNumber ?? r.lotNumber,
            serialNumber: input.serialNumber ?? r.serialNumber,
          }
          : r);
      }
      const newRecord: StockRecord = {
        id: `stk-${input.partId}-${input.location}`,
        partId: input.partId,
        pn: input.pn,
        name: input.name,
        cat: input.cat,
        onHand: input.quantity,
        allocated: 0,
        onOrder: 0,
        location: input.location,
        leadTimeDays: 14,
        quarantineQty: input.quarantine ? input.quantity : undefined,
        lotNumber: input.lotNumber,
        serialNumber: input.serialNumber,
      };
      return [...prev, newRecord];
    });
    if (input.orderId) {
      setOrders(prev => prev.map(o => {
        if (o.id !== input.orderId) return o;
        const remainingQty = Math.max(0, o.remainingQty - input.quantity);
        return { ...o, remainingQty, status: remainingQty === 0 ? 'received' : 'partially_received' };
      }));
    }
    setTransactions(prev => [{
      id: `txn-${Date.now()}`,
      partId: input.partId,
      type: 'receive',
      qty: input.quantity,
      location: input.location,
      reference: input.reference,
      note: input.note,
      quarantine: input.quarantine,
      createdAt: new Date().toISOString(),
      createdBy: 'You',
    }, ...prev]);
    toast.success(`Received ${input.quantity} × ${input.pn}`);
  };

  const handlePlaceOrder = (input: PlaceOrderInput) => {
    const newOrder: OrderRecord = {
      id: `ord-${input.partId}-${Date.now()}`,
      partId: input.partId,
      pn: input.pn,
      quantity: input.quantity,
      remainingQty: input.quantity,
      expectedDate: input.expectedDate,
      supplierRef: input.supplierRef,
      unitCost: input.unitCost,
      location: input.location,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: 'You',
    };
    setOrders(prev => [newOrder, ...prev]);
  };

  const handleReleaseQuarantine = (recordId: string, qty: number) => {
    setStock(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      return { ...r, quarantineQty: Math.max(0, (r.quarantineQty ?? 0) - qty) };
    }));
    const record = stock.find(r => r.id === recordId);
    if (record) {
      setTransactions(prev => [{
        id: `txn-${Date.now()}`,
        partId: record.partId,
        type: 'adjust',
        direction: 'add',
        qty,
        location: record.location,
        reasonCode: 'Released from quarantine',
        createdAt: new Date().toISOString(),
        createdBy: 'You',
      }, ...prev]);
    }
    toast.success(`Released ${qty} from quarantine`);
  };

  const handleAdjust = (input: AdjustQuantityInput) => {
    setStock(prev => prev.map(r => {
      if (r.partId !== input.partId || r.location !== input.location) return r;
      const delta = input.direction === 'add' ? input.quantity : -input.quantity;
      return { ...r, onHand: Math.max(0, r.onHand + delta) };
    }));
    setTransactions(prev => [{
      id: `txn-${Date.now()}`,
      partId: input.partId,
      type: 'adjust',
      direction: input.direction,
      qty: input.quantity,
      location: input.location,
      reasonCode: input.reasonCode,
      note: input.note,
      createdAt: new Date().toISOString(),
      createdBy: 'You',
    }, ...prev]);
    toast.success('Adjustment posted');
  };

  const coverageOf = (r: StockRecord): CoverageStatus =>
    computeCoverage(r, demandByPartId.get(r.partId) ?? 0);

  const filteredStock = useMemo(() => {
    return displayStock.filter(r => {
      if (categoryFilter !== 'all' && r.cat !== categoryFilter) return false;
      if (search && !`${r.pn} ${r.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      const coverage = coverageOf(r);
      if (quickFilter === 'low-coverage' && coverage === 'ready') return false;
      if (quickFilter === 'on-order' && r.onOrder <= 0) return false;
      if (quickFilter === 'lot-serial' && !r.lotNumber && !r.serialNumber) return false;
      if (quickFilter === 'quarantine' && !(r.quarantineQty && r.quarantineQty > 0)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStock, categoryFilter, search, quickFilter, demandByPartId]);

  // Cards view groups by category (unless a single category is already filtered), each
  // group preceded by a small "CATEGORY NAME · count" header — mirrors the design system's
  // card grouping for Inventory.
  const cardGroups = useMemo(() => {
    if (categoryFilter !== 'all') return [{ cat: categoryFilter as BOMCategory, items: filteredStock }];
    const byCat = new Map<BOMCategory, StockRecord[]>();
    for (const r of filteredStock) {
      if (!byCat.has(r.cat)) byCat.set(r.cat, []);
      byCat.get(r.cat)!.push(r);
    }
    return KNOWN_BOM_CATEGORIES.filter(cat => byCat.has(cat)).map(cat => ({ cat, items: byCat.get(cat)! }));
  }, [filteredStock, categoryFilter]);

  const coverageCounts = useMemo(() => {
    const counts: Record<CoverageStatus, number> = { ready: 0, 'covered-by-order': 0, short: 0, conflict: 0 };
    for (const r of displayStock) counts[coverageOf(r)]++;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStock, demandByPartId]);

  const totalParts = displayStock.length;
  const belowCoverage = coverageCounts.short + coverageCounts.conflict;
  const incomingCount = displayStock.filter(r => r.onOrder > 0).length;
  const quarantineCount = displayStock.filter(r => (r.quarantineQty ?? 0) > 0).length;

  const [customBuildDefs, setCustomBuildDefs] = useState<BuildDef[]>([]);
  const builds = useMemo(() => [
    ...generateMockBuilds(displayStock, demandByPartId),
    ...customBuildDefs.map(def => buildFromDef(def, displayStock, demandByPartId)),
  ], [displayStock, demandByPartId, customBuildDefs]);
  const [activeTab, setActiveTab] = useState('stock');
  const [openBuildId, setOpenBuildId] = useState<string | null>(null);
  const openBuild = (buildId: string) => { setActiveTab('builds'); setOpenBuildId(buildId); };

  const handleAddBuild = (input: NewBuildInput) => {
    const newDef: BuildDef = { id: `build-${Date.now()}`, ...input };
    setCustomBuildDefs(prev => [...prev, newDef]);
    openBuild(newDef.id);
    toast.success(`${newDef.name} created`);
  };

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dialogPartId, setDialogPartId] = useState<string | undefined>(undefined);

  const openDetail = (partId: string) => { setSelectedPartId(partId); setDetailOpen(true); };
  const selectedRecord = useMemo(
    () => displayStock.find(r => r.partId === selectedPartId) ?? null,
    [displayStock, selectedPartId]
  );
  const selectedPart = parts.find(p => p.id === selectedPartId);
  const whereUsed: WhereUsedRow[] = useMemo(() => {
    if (!selectedPartId) return [];
    return bomFlatAll(rootNodes)
      .filter(n => n._partId === selectedPartId)
      .map(n => ({ levelLabel: n.levelLabel, name: n.name, qty: n.qty, uom: n.uom, designators: n.designators || undefined }));
  }, [rootNodes, selectedPartId]);

  const openReceiveFor = (partId?: string) => { setDialogPartId(partId); setReceiveOpen(true); };
  const openAdjustFor = (partId?: string) => { setDialogPartId(partId); setAdjustOpen(true); };
  const openOrderFor = (partId?: string) => { setDialogPartId(partId); setOrderOpen(true); };

  // Mobile's Receive/New transaction shortcuts live in the app header (AppHeader), which
  // has no access to this component's local dialog state — it hands off via ?action=.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'receive') openReceiveFor();
    else if (action === 'adjust') openAdjustFor();
    else if (action === 'order') openOrderFor();
    if (action) {
      setSearchParams((prev) => { prev.delete('action'); return prev; }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6">
      {isMobile ? null : (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BoxesIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Inventory</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => openOrderFor()}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Order
            </Button>
            <Button variant="outline" onClick={() => openReceiveFor()}>
              <Download className="h-4 w-4 mr-2" />
              Receive
            </Button>
            <Button onClick={() => openAdjustFor()}>
              <Pencil className="h-4 w-4 mr-2" />
              <span className="truncate">New transaction</span>
            </Button>
          </div>
        </div>
      )}

      <div className={cn('gap-2.5', isMobile ? 'grid grid-cols-2' : 'flex flex-wrap md:gap-3')}>
        <StatCard label="Total Parts" value={String(totalParts)} icon={BoxesIcon} iconColor="#2563EB" accent />
        <StatCard label="Ready to Build" value={String(coverageCounts.ready)} icon={CheckCircle} iconColor="#16A34A" />
        <StatCard label="Below Coverage" value={String(belowCoverage)} icon={AlertTriangle} iconColor="#DC2626" />
        <StatCard label="Incoming This Week" value={String(incomingCount)} icon={Truck} iconColor="#D97706" />
        <StatCard label="In Quarantine" value={String(quarantineCount)} icon={Lock} iconColor="#7C3AED" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn(isMobile && 'w-full grid grid-cols-3 sticky top-0 z-10 bg-background')}>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="builds">Builds</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {belowCoverage > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{belowCoverage}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <div className="space-y-4">
              <div className={cn('flex gap-3', isMobile ? 'flex-row items-center' : 'flex-col lg:flex-row lg:items-center')}>
                <div className="relative w-full lg:max-w-xs lg:flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parts, MPN, manufacturer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {isMobile ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn('h-10 w-10 shrink-0', (quickFilter !== 'all' || categoryFilter !== 'all') && 'border-primary text-primary')}
                    onClick={() => setFiltersOpen(true)}
                    title="Filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap lg:flex-1 pb-0.5">
                      {QUICK_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setQuickFilter(f.value)}
                          className={cn(
                            'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                            quickFilter === f.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex bg-muted border border-border rounded-lg p-0.5 gap-0.5 shrink-0 self-start lg:self-auto">
                      <button
                        onClick={() => setViewMode('table')}
                        title="Table view"
                        className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border-none cursor-pointer transition-colors',
                          viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'bg-transparent text-muted-foreground hover:text-foreground')}
                      >
                        <TableIcon className="w-3.5 h-3.5" /> Table
                      </button>
                      <button
                        onClick={() => setViewMode('cards')}
                        title="Cards view"
                        className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border-none cursor-pointer transition-colors',
                          viewMode === 'cards' ? 'bg-card text-foreground shadow-sm' : 'bg-transparent text-muted-foreground hover:text-foreground')}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> Cards
                      </button>
                    </div>
                  </>
                )}
              </div>

              {!isMobile && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-0.5">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={cn(
                      'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      categoryFilter === 'all'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    All categories
                  </button>
                  {KNOWN_BOM_CATEGORIES.map((cat) => {
                    const meta = getCategoryMeta(cat);
                    const active = categoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className="shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                        style={active
                          ? { background: meta.tint, color: '#fff', borderColor: meta.tint }
                          : { background: 'transparent', color: meta.tint, borderColor: `${meta.tint}40` }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {isMobile && (
                <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <DrawerContent className="max-h-[85vh]">
                    <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-foreground" />
                        <DrawerTitle className="text-base font-semibold">Filter parts</DrawerTitle>
                      </div>
                      <button
                        onClick={() => { setQuickFilter('all'); setCategoryFilter('all'); }}
                        className="text-sm font-medium text-primary"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="overflow-y-auto px-4 py-4 space-y-5">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_FILTERS.map((f) => {
                            const active = quickFilter === f.value;
                            return (
                              <button
                                key={f.value}
                                onClick={() => setQuickFilter(f.value)}
                                className={cn(
                                  'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
                                  active
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'bg-background text-foreground border-input'
                                )}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</h4>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setCategoryFilter('all')}
                            className={cn(
                              'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
                              categoryFilter === 'all'
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-background text-foreground border-input'
                            )}
                          >
                            All categories
                          </button>
                          {KNOWN_BOM_CATEGORIES.map((cat) => {
                            const meta = getCategoryMeta(cat);
                            const active = categoryFilter === cat;
                            return (
                              <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
                                  active
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'bg-background text-foreground border-input'
                                )}
                              >
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.tint }} />
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <DrawerFooter className="pt-2">
                      <Button className="w-full" onClick={() => setFiltersOpen(false)}>Show results</Button>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              )}

              {isMobile ? (
                <div className="space-y-5">
                  {cardGroups.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <PackageSearch className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">No parts match your filters</div>
                    </div>
                  ) : cardGroups.map(({ cat, items }) => {
                    const groupMeta = getCategoryMeta(cat);
                    return (
                      <div key={cat}>
                        {categoryFilter === 'all' && (
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: groupMeta.tint }} />
                            <span className="text-xs font-bold uppercase tracking-wide text-foreground">{groupMeta.label}</span>
                            <span className="text-xs text-muted-foreground">{items.length}</span>
                          </div>
                        )}
                        <div className="space-y-2">
                          {items.map((r) => {
                            const available = availableOf(r);
                            const status = coverageOf(r);
                            return (
                              <button
                                key={r.id}
                                onClick={() => openDetail(r.partId)}
                                className="w-full text-left rounded-xl border border-border bg-card p-3 active:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Layers className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-foreground truncate">{r.name}</div>
                                    <div className="text-xs font-mono text-muted-foreground truncate">{r.pn}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <CoveragePill status={status} />
                                    <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">{r.location}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 pt-2.5 mt-2.5 border-t border-border">
                                  <div>
                                    <div className="text-sm font-semibold">{r.onHand}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">On Hand</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{r.allocated}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Alloc</div>
                                  </div>
                                  <div>
                                    <div className={cn('text-sm font-semibold', available < 0 && 'text-destructive')}>{available}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avail</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{r.onOrder || '—'}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Order</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : viewMode === 'table' ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 px-3 py-2 w-[120px] text-[11px] font-medium uppercase tracking-wider">Coverage</TableHead>
                        <TableHead className="h-9 px-3 py-2 w-[260px] text-[11px] font-medium uppercase tracking-wider">Part</TableHead>
                        <TableHead className="h-9 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider"><HeaderTip label="On Hand" /></TableHead>
                        <TableHead className="hidden sm:table-cell h-9 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider"><HeaderTip label="Allocated" /></TableHead>
                        <TableHead className="h-9 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider"><HeaderTip label="Available" /></TableHead>
                        <TableHead className="hidden md:table-cell h-9 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider"><HeaderTip label="On Order" /></TableHead>
                        <TableHead className="h-9 px-3 py-2 text-[11px] font-medium uppercase tracking-wider">Location</TableHead>
                        <TableHead className="hidden lg:table-cell h-9 px-3 py-2 text-[11px] font-medium uppercase tracking-wider">Lead</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStock.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                            <PackageSearch className="h-6 w-6 mx-auto mb-2 opacity-50" />
                            No parts match your filters
                          </TableCell>
                        </TableRow>
                      ) : filteredStock.map((r) => {
                        const available = availableOf(r);
                        const status = coverageOf(r);
                        return (
                          <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetail(r.partId)}>
                            <TableCell className="px-3 py-2 align-top">
                              <CoveragePill status={status} />
                              <CoverageBar status={status} record={r} />
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <HoverZoomImage imageUrl={r.imageUrl} enabled={!!r.imageUrl}>
                                  <PartThumb cat={r.cat} size={32} radius={7} imageUrl={r.imageUrl} />
                                </HoverZoomImage>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                                  <div className="text-xs font-mono text-muted-foreground truncate">{r.pn}</div>
                                  {(r.lotNumber || r.serialNumber) && (
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {r.lotNumber && <>Lot {r.lotNumber}</>}
                                      {r.lotNumber && r.serialNumber && ' · '}
                                      {r.serialNumber && <>SN {r.serialNumber}</>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right">{r.onHand}</TableCell>
                            <TableCell className="hidden sm:table-cell px-3 py-2 text-right">{r.allocated}</TableCell>
                            <TableCell className={cn('px-3 py-2 text-right font-semibold', available < 0 && 'text-destructive')}>
                              {available}
                            </TableCell>
                            <TableCell className="hidden md:table-cell px-3 py-2 text-right">{r.onOrder || '—'}</TableCell>
                            <TableCell className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-[10px] font-normal">{r.location}</Badge>
                                {r.quarantineQty ? <Badge variant="outline" className="text-[10px] font-normal"><Lock className="h-2.5 w-2.5 mr-1" />QA</Badge> : null}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell px-3 py-2 text-xs text-muted-foreground">{formatLeadTime(r.leadTimeDays)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredStock.length > 0 && (
                    <div className="px-3 py-2.5 border-t border-border text-xs text-muted-foreground">
                      Showing {filteredStock.length} of {totalParts} total parts
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {cardGroups.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <PackageSearch className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">No parts match your filters</div>
                    </div>
                  ) : cardGroups.map(({ cat, items }) => {
                    const groupMeta = getCategoryMeta(cat);
                    return (
                      <div key={cat}>
                        {categoryFilter === 'all' && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: groupMeta.tint }} />
                            <span className="text-xs font-bold uppercase tracking-wide text-foreground">{groupMeta.label}</span>
                            <span className="text-xs text-muted-foreground">{items.length}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((r) => {
                            const available = availableOf(r);
                            const status = coverageOf(r);
                            return (
                              <Card
                                key={r.id}
                                className="cursor-pointer hover:shadow-sm transition-shadow rounded-xl"
                                onClick={() => openDetail(r.partId)}
                              >
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-start gap-2.5">
                                    <PartThumb cat={r.cat} size={40} radius={8} imageUrl={r.imageUrl} />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-semibold truncate" style={{ color: groupMeta.tint }}>{r.pn}</div>
                                      <div className="text-sm font-semibold text-foreground truncate">{r.name}</div>
                                      {(r.lotNumber || r.serialNumber) && (
                                        <div className="text-[10px] text-muted-foreground truncate">
                                          {r.lotNumber && <>Lot {r.lotNumber}</>}
                                          {r.lotNumber && r.serialNumber && ' · '}
                                          {r.serialNumber && <>SN {r.serialNumber}</>}
                                        </div>
                                      )}
                                    </div>
                                    {(r.lotNumber || r.serialNumber) && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium gap-1 shrink-0"
                                        style={{ color: '#7C3AED', borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)' }}
                                      >
                                        <Layers className="h-2.5 w-2.5" /> {r.lotNumber && r.serialNumber ? 'Lot/SN' : r.lotNumber ? 'Lot' : 'SN'}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <CoveragePill status={status} />
                                    <div className="flex items-center gap-1 flex-wrap justify-end">
                                      <Badge variant="outline" className="text-[10px] font-normal">{r.location}</Badge>
                                      {r.quarantineQty ? <Badge variant="outline" className="text-[10px] font-normal"><Lock className="h-2.5 w-2.5 mr-1" />QA</Badge> : null}
                                    </div>
                                  </div>

                                  <CoverageBar status={status} record={r} />

                                  <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-border">
                                    <div>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide"><HeaderTip label="On Hand" /></div>
                                      <div className="text-sm font-semibold">{r.onHand}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide"><HeaderTip label="Allocated" /></div>
                                      <div className="text-sm font-semibold">{r.allocated}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide"><HeaderTip label="Available" /></div>
                                      <div className={cn('text-sm font-semibold', available < 0 && 'text-destructive')}>{available}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide"><HeaderTip label="On Order" /></div>
                                      <div className="text-sm font-semibold">{r.onOrder || '—'}</div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </TabsContent>

        <TabsContent value="builds" className="mt-4">
          <BuildsPanel
            builds={builds}
            onSelectPart={openDetail}
            openBuildId={openBuildId}
            onOpenBuildHandled={() => setOpenBuildId(null)}
            onAddBuild={handleAddBuild}
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel
            builds={builds}
            stock={displayStock}
            coverageOf={coverageOf}
            onSelectPart={openDetail}
            onSelectBuild={openBuild}
            onViewBuilds={() => setActiveTab('builds')}
          />
        </TabsContent>
      </Tabs>

      <ReceiveStockDialog
        isOpen={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        orgId={orgId}
        parts={parts}
        orders={orders}
        onReceive={handleReceive}
        initialPartId={dialogPartId}
      />
      <AdjustQuantityDialog
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        stock={displayStock}
        onAdjust={handleAdjust}
        initialPartId={dialogPartId}
      />
      <PlaceOrderDialog
        isOpen={orderOpen}
        onClose={() => setOrderOpen(false)}
        parts={parts}
        onPlaceOrder={handlePlaceOrder}
        initialPartId={dialogPartId}
      />
      <PartDetailSheet
        isOpen={detailOpen}
        record={selectedRecord}
        status={selectedRecord ? coverageOf(selectedRecord) : 'ready'}
        part={selectedPart}
        transactions={transactions}
        orders={orders}
        whereUsed={whereUsed}
        onClose={() => setDetailOpen(false)}
        onReceive={() => openReceiveFor(selectedPartId ?? undefined)}
        onAdjust={() => openAdjustFor(selectedPartId ?? undefined)}
        onReleaseQuarantine={(qty) => selectedRecord && handleReleaseQuarantine(selectedRecord.id, qty)}
      />
    </div>
  );
}
