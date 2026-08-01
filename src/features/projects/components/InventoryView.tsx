import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, Table as TableIcon, LayoutGrid, Download, Pencil, PackageSearch,
  AlertTriangle, Truck, Hash, Lock, Boxes as BoxesIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useBomTree } from '@/hooks/useBom';
import { useOrgParts } from '@/hooks/useParts';
import {
  fromApiNode, applyPriceRollup, assignLevelLabels, bomFlatAll, formatLeadTime,
  KNOWN_BOM_CATEGORIES, getCategoryMeta,
} from './bomData';
import {
  generateMockStock, computeCoverage, availableOf, CoveragePill, COVERAGE_META,
  type StockRecord, type StockTransaction, type CoverageStatus,
} from './inventoryData';
import { ReceiveStockDialog, type ReceiveStockInput } from './ReceiveStockDialog';
import { AdjustQuantityDialog, type AdjustQuantityInput } from './AdjustQuantityDialog';

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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
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
  const lotSerialCount = stock.filter(r => r.lotSerial).length;
  const quarantineCount = stock.filter(r => (r.quarantineQty ?? 0) > 0).length;
  const totalForBar = Math.max(totalParts, 1);

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BoxesIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Inventory</h2>
            <p className="text-sm text-muted-foreground">
              Component availability for engineering builds — can we build it, what's short, does it move the date.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setReceiveOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Receive
          </Button>
          <Button onClick={() => setAdjustOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            New transaction
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stock">
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
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
            <div className="space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parts, MPN, manufacturer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-1 border rounded-md p-1 shrink-0">
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

              <div className="flex flex-wrap gap-1.5">
                {QUICK_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setQuickFilter(f.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      quickFilter === f.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
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
                      className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
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
                        <TableHead>Coverage</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead className="text-right">On Hand</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">On Order</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Lead</TableHead>
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
                        return (
                          <TableRow key={r.id}>
                            <TableCell><CoveragePill status={coverageOf(r)} /></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold"
                                  style={{ background: `${meta.tint}1a`, color: meta.tint }}
                                >
                                  {meta.label.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-primary truncate">{r.pn}</div>
                                  <div className="text-xs text-muted-foreground truncate">{r.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{r.onHand}</TableCell>
                            <TableCell className="text-right">{r.allocated}</TableCell>
                            <TableCell className={cn('text-right font-semibold', available < 0 && 'text-destructive')}>
                              {available}
                            </TableCell>
                            <TableCell className="text-right">{r.onOrder || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-[10px] font-normal">{r.location}</Badge>
                                {r.quarantineQty ? <Badge variant="outline" className="text-[10px] font-normal"><Lock className="h-2.5 w-2.5 mr-1" />QA</Badge> : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatLeadTime(r.leadTimeDays)}</TableCell>
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
                      <Card key={r.id}>
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

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">BUILD READINESS</h3>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    {(Object.keys(COVERAGE_META) as CoverageStatus[]).map((status) => {
                      const count = coverageCounts[status];
                      if (!count) return null;
                      return (
                        <div
                          key={status}
                          style={{ width: `${(count / totalForBar) * 100}%`, background: COVERAGE_META[status].fg }}
                        />
                      );
                    })}
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {(Object.keys(COVERAGE_META) as CoverageStatus[]).map((status) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: COVERAGE_META[status].fg }} />
                          <span className="text-muted-foreground">{COVERAGE_META[status].label}</span>
                        </div>
                        <span className="font-medium">{coverageCounts[status]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">AT A GLANCE</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><BoxesIcon className="h-3.5 w-3.5" /> Total parts</span>
                      <span className="font-medium">{totalParts}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Below coverage</span>
                      <span className="font-medium">{belowCoverage}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><Truck className="h-3.5 w-3.5" /> Incoming this week</span>
                      <span className="font-medium">{incomingCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><Hash className="h-3.5 w-3.5" /> Lot / serial tracked</span>
                      <span className="font-medium">{lotSerialCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><Lock className="h-3.5 w-3.5" /> In quarantine</span>
                      <span className="font-medium">{quarantineCount}</span>
                    </div>
                    {transactions.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                        <span>Ledger entries this session</span>
                        <span className="font-medium">{transactions.length}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setReceiveOpen(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Receive stock
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="builds" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Build-order readiness is coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Shortage and reorder alerts are coming soon.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceiveStockDialog
        isOpen={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        orgId={orgId}
        parts={parts}
        onReceive={handleReceive}
      />
      <AdjustQuantityDialog
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        stock={stock}
        onAdjust={handleAdjust}
      />
    </div>
  );
}
