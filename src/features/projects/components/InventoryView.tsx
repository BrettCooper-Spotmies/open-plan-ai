import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, Table as TableIcon, LayoutGrid, Download, Pencil, PackageSearch,
  AlertTriangle, Truck, CheckCircle, Lock, Boxes as BoxesIcon,
  Zap, Cpu, Package, Box, Monitor, Shield, Layers, Tag,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBomTree } from '@/hooks/useBom';
import { useOrgParts } from '@/hooks/useParts';
import {
  fromApiNode, applyPriceRollup, assignLevelLabels, bomFlatAll, formatLeadTime,
  KNOWN_BOM_CATEGORIES, getCategoryMeta,
} from './bomData';
import {
  generateMockStock, generateMockBuilds, computeCoverage, availableOf, CoveragePill, CoverageBar,
  type StockRecord, type StockTransaction, type CoverageStatus,
} from './inventoryData';
import { HoverZoomImage } from './BOMShared';
import { ReceiveStockDialog, type ReceiveStockInput } from './ReceiveStockDialog';
import { AdjustQuantityDialog, type AdjustQuantityInput } from './AdjustQuantityDialog';
import { PartDetailSheet, type WhereUsedRow } from './PartDetailSheet';
import { BuildsPanel } from './BuildsPanel';
import { AlertsPanel } from './AlertsPanel';

// Maps bomData's BOM_CAT_META.iconName strings to the actual icon component.
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = { Zap, Cpu, Package, Box, Monitor, Shield, Layers, Tag };

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
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && rootNodes.length > 0) {
      setStock(generateMockStock(rootNodes));
      seededRef.current = true;
    }
  }, [rootNodes]);

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const handleReceive = (input: ReceiveStockInput) => {
    setStock(prev => {
      const existing = prev.find(r => r.partId === input.partId && r.location === input.location);
      if (existing) {
        return prev.map(r => r.id === existing.id
          ? {
            ...r,
            onHand: r.onHand + input.quantity,
            quarantineQty: input.quarantine ? (r.quarantineQty ?? 0) + input.quantity : r.quarantineQty,
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
      };
      return [...prev, newRecord];
    });
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
    return stock.filter(r => {
      if (categoryFilter !== 'all' && r.cat !== categoryFilter) return false;
      if (search && !`${r.pn} ${r.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      const coverage = coverageOf(r);
      if (quickFilter === 'low-coverage' && coverage === 'ready') return false;
      if (quickFilter === 'on-order' && r.onOrder <= 0) return false;
      if (quickFilter === 'lot-serial' && !r.lotSerial) return false;
      if (quickFilter === 'quarantine' && !(r.quarantineQty && r.quarantineQty > 0)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, categoryFilter, search, quickFilter, demandByPartId]);

  const coverageCounts = useMemo(() => {
    const counts: Record<CoverageStatus, number> = { ready: 0, 'covered-by-order': 0, short: 0, conflict: 0 };
    for (const r of stock) counts[coverageOf(r)]++;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, demandByPartId]);

  const totalParts = stock.length;
  const belowCoverage = coverageCounts.short + coverageCounts.conflict;
  const incomingCount = stock.filter(r => r.onOrder > 0).length;

  const builds = useMemo(() => generateMockBuilds(stock, demandByPartId), [stock, demandByPartId]);
  const [activeTab, setActiveTab] = useState('stock');

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dialogPartId, setDialogPartId] = useState<string | undefined>(undefined);

  const openDetail = (partId: string) => { setSelectedPartId(partId); setDetailOpen(true); };
  const selectedRecord = useMemo(
    () => stock.find(r => r.partId === selectedPartId) ?? null,
    [stock, selectedPartId]
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

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BoxesIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Inventory</h2>
            {/* <p className="text-sm text-muted-foreground">
              Component availability for engineering builds — can we build it, what's short, does it move the date.
            </p> */}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
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

      <div className="flex gap-2.5 md:gap-3 flex-wrap">
        <StatCard label="Total Parts" value={String(totalParts)} icon={BoxesIcon} iconColor="#2563EB" accent />
        <StatCard label="Ready to Build" value={String(coverageCounts.ready)} icon={CheckCircle} iconColor="#16A34A" />
        <StatCard label="Below Coverage" value={String(belowCoverage)} icon={AlertTriangle} iconColor="#DC2626" />
        <StatCard label="Incoming This Week" value={String(incomingCount)} icon={Truck} iconColor="#D97706" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
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
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative w-full lg:max-w-xs lg:flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parts, MPN, manufacturer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

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

                <div className="flex items-center gap-1 border rounded-md p-1 shrink-0 self-start lg:self-auto">
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => setViewMode('table')}
                  >
                    <TableIcon className="h-4 w-4 mr-1.5" /> Table
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => setViewMode('cards')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-1.5" /> Cards
                  </Button>
                </div>
              </div>

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

              {viewMode === 'table' ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 px-3 py-2 w-[120px]">Coverage</TableHead>
                        <TableHead className="h-9 px-3 py-2 w-[260px]">Part</TableHead>
                        <TableHead className="h-9 px-3 py-2 text-right">On Hand</TableHead>
                        <TableHead className="hidden sm:table-cell h-9 px-3 py-2 text-right">Allocated</TableHead>
                        <TableHead className="h-9 px-3 py-2 text-right">Available</TableHead>
                        <TableHead className="hidden md:table-cell h-9 px-3 py-2 text-right">On Order</TableHead>
                        <TableHead className="h-9 px-3 py-2">Location</TableHead>
                        <TableHead className="hidden lg:table-cell h-9 px-3 py-2">Lead</TableHead>
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
                        const meta = getCategoryMeta(r.cat);
                        const status = coverageOf(r);
                        const CategoryIcon = CATEGORY_ICON_MAP[meta.iconName] ?? Tag;
                        return (
                          <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetail(r.partId)}>
                            <TableCell className="px-3 py-2 align-top">
                              <CoveragePill status={status} />
                              <CoverageBar status={status} record={r} />
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {r.imageUrl ? (
                                  <HoverZoomImage imageUrl={r.imageUrl}>
                                    <img
                                      src={r.imageUrl}
                                      alt=""
                                      className="h-7 w-7 shrink-0 rounded-md object-cover"
                                    />
                                  </HoverZoomImage>
                                ) : (
                                  <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                                    style={{ background: `${meta.tint}1a`, color: meta.tint }}
                                  >
                                    <CategoryIcon className="h-3.5 w-3.5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-primary truncate">{r.pn}</div>
                                  <div className="text-xs text-muted-foreground truncate">{r.name}</div>
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
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredStock.map((r) => {
                    const available = availableOf(r);
                    const meta = getCategoryMeta(r.cat);
                    return (
                      <Card key={r.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDetail(r.partId)}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-primary truncate">{r.pn}</div>
                              <div className="text-xs text-muted-foreground truncate">{r.name}</div>
                            </div>
                            <CoveragePill status={coverageOf(r)} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center pt-1">
                            <div>
                              <div className="text-sm font-semibold">{r.onHand}</div>
                              <div className="text-[10px] text-muted-foreground">On Hand</div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold">{r.allocated}</div>
                              <div className="text-[10px] text-muted-foreground">Allocated</div>
                            </div>
                            <div>
                              <div className={cn('text-sm font-semibold', available < 0 && 'text-destructive')}>{available}</div>
                              <div className="text-[10px] text-muted-foreground">Available</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <Badge variant="outline" className="text-[10px] font-normal" style={{ borderColor: `${meta.tint}40`, color: meta.tint }}>{meta.label}</Badge>
                            <span>{r.location}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
          </div>
        </TabsContent>

        <TabsContent value="builds" className="mt-4">
          <BuildsPanel builds={builds} onSelectPart={openDetail} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel
            builds={builds}
            stock={stock}
            coverageOf={coverageOf}
            onSelectPart={openDetail}
            onViewBuilds={() => setActiveTab('builds')}
          />
        </TabsContent>
      </Tabs>

      <ReceiveStockDialog
        isOpen={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        orgId={orgId}
        parts={parts}
        onReceive={handleReceive}
        initialPartId={dialogPartId}
      />
      <AdjustQuantityDialog
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        stock={stock}
        onAdjust={handleAdjust}
        initialPartId={dialogPartId}
      />
      <PartDetailSheet
        isOpen={detailOpen}
        record={selectedRecord}
        status={selectedRecord ? coverageOf(selectedRecord) : 'ready'}
        part={selectedPart}
        transactions={transactions}
        whereUsed={whereUsed}
        onClose={() => setDetailOpen(false)}
        onReceive={() => openReceiveFor(selectedPartId ?? undefined)}
        onAdjust={() => openAdjustFor(selectedPartId ?? undefined)}
      />
    </div>
  );
}
