import { useMemo } from 'react';
import {
  Download, Upload, Pencil, ArrowLeftRight, ClipboardCheck, MapPin, ChevronLeft,
  Zap, Cpu, Package, Box, Monitor, Shield, Layers, Tag,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCategoryMeta, formatLeadTime, type ApiPartResponse } from './bomData';
import {
  availableOf, CoveragePill, STOCK_LOCATIONS,
  type StockRecord, type StockTransaction, type CoverageStatus,
} from './inventoryData';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = { Zap, Cpu, Package, Box, Monitor, Shield, Layers, Tag };

export interface WhereUsedRow {
  levelLabel?: string;
  name: string;
  qty: number;
  uom: string;
  designators?: string;
}

interface PartDetailSheetProps {
  isOpen: boolean;
  record: StockRecord | null;
  status: CoverageStatus;
  part?: ApiPartResponse;
  transactions: StockTransaction[];
  whereUsed: WhereUsedRow[];
  onClose: () => void;
  onReceive: () => void;
  onAdjust: () => void;
}

function StatItem({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xl sm:text-2xl font-bold leading-tight" style={color ? { color } : undefined}>{value}</div>
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase truncate">{label}</div>
    </div>
  );
}

export function PartDetailSheet({
  isOpen, record, status, part, transactions, whereUsed, onClose, onReceive, onAdjust,
}: PartDetailSheetProps) {
  const isMobile = useIsMobile();

  const partTxns = useMemo(() => {
    if (!record) return [];
    return transactions
      .filter(t => t.partId === record.partId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [record, transactions]);

  const stockRows = useMemo(() => {
    if (!record) return [];
    const rows: { location: string; label: string; qty: number; color: string }[] = [];
    const available = availableOf(record);
    if (available > 0) rows.push({ location: record.location, label: 'Available', qty: available, color: '#16A34A' });
    if (record.allocated > 0) {
      const secondSite = STOCK_LOCATIONS.find(l => l !== record.location && l !== 'Quarantine') ?? 'CM';
      rows.push({ location: secondSite, label: 'Allocated', qty: record.allocated, color: '#2563EB' });
    }
    if (record.quarantineQty) rows.push({ location: 'Quarantine', label: 'Quarantine', qty: record.quarantineQty, color: '#D97706' });
    if (rows.length === 0) rows.push({ location: record.location, label: 'On hand', qty: record.onHand, color: '#16A34A' });
    return rows;
  }, [record]);

  if (!record) return null;

  const meta = getCategoryMeta(record.cat);
  const CategoryIcon = CATEGORY_ICON_MAP[meta.iconName] ?? Tag;

  const tabTriggerClass = cn(
    'rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground shrink-0',
    'data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none'
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideClose={isMobile}
        className={cn(
          'p-0 overflow-y-auto overflow-x-hidden',
          isMobile
            ? 'inset-0 left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 bg-muted'
            : 'max-w-3xl max-h-[85vh]'
        )}
      >
        <DialogTitle className="sr-only">{record.pn} — {record.name}</DialogTitle>

        {isMobile && (
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold truncate">{record.pn}</h2>
          </div>
        )}

        <div className={cn('min-w-0 p-4 sm:p-6 space-y-4', isMobile && 'pt-3 pb-6')}>
          <div className={cn(isMobile && 'rounded-2xl border bg-background overflow-hidden shadow-sm')}>
            <div className={cn('flex items-start gap-3', isMobile && 'p-4')}>
              {record.imageUrl ? (
                <img src={record.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${meta.tint}1a`, color: meta.tint }}
                >
                  <CategoryIcon className="h-5 w-5" />
                </div>
              )}
              <div className={cn('min-w-0 flex-1', !isMobile && 'pr-8')}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-primary">{record.pn}</span>
                  <CoveragePill status={status} />
                </div>
                <h2 className="text-lg font-semibold leading-tight truncate">{record.name}</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {[part?.manufacturer, part?.mpn, meta.label, part?.unit ?? 'EA'].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <div
              className={cn(
                'grid grid-cols-3 gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-6',
                isMobile ? 'border-t px-4 py-4' : 'py-2'
              )}
            >
              <StatItem label="On Hand" value={record.onHand} />
              <StatItem label="Allocated" value={record.allocated} />
              <StatItem label="Available" value={availableOf(record)} color={availableOf(record) < 0 ? '#DC2626' : '#16A34A'} />
              <StatItem label="On Order" value={record.onOrder} color={record.onOrder > 0 ? '#D97706' : undefined} />
              <StatItem label="Quarantine" value={record.quarantineQty ?? 0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              className="h-11 rounded-xl min-w-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4"
              onClick={onReceive}
            >
              <Download className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Receive</span>
            </Button>
            <Button
              className="h-11 rounded-xl min-w-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4"
              variant="outline"
              onClick={onAdjust}
            >
              <Pencil className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Adjust</span>
            </Button>
            {!isMobile && (
              <>
                <Button className="min-w-0 px-4" variant="outline" disabled title="Coming soon">
                  <Upload className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Issue</span>
                </Button>
                <Button className="min-w-0 px-4" variant="outline" disabled title="Coming soon">
                  <ArrowLeftRight className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Transfer</span>
                </Button>
                <Button className="min-w-0 px-4" variant="outline" disabled title="Coming soon">
                  <ClipboardCheck className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Allocate</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="stock" className="min-w-0 border-t">
          <div className="px-4 sm:px-6 pt-3 overflow-x-auto no-scrollbar">
            <TabsList className="bg-transparent p-0 h-auto gap-2 justify-start">
              <TabsTrigger value="stock" className={tabTriggerClass}>
                Stock <span className="ml-1 text-[11px] opacity-70">{stockRows.length}</span>
              </TabsTrigger>
              <TabsTrigger value="movements" className={tabTriggerClass}>
                Movements <span className="ml-1 text-[11px] opacity-70">{partTxns.length}</span>
              </TabsTrigger>
              <TabsTrigger value="allocations" className={tabTriggerClass}>
                Allocations <span className="ml-1 text-[11px] opacity-70">{record.allocated > 0 ? 1 : 0}</span>
              </TabsTrigger>
              <TabsTrigger value="where-used" className={tabTriggerClass}>
                Where-used <span className="ml-1 text-[11px] opacity-70">{whereUsed.length}</span>
              </TabsTrigger>
              <TabsTrigger value="supply" className={tabTriggerClass}>
                Supply <span className="ml-1 text-[11px] opacity-70">{record.onOrder > 0 ? 1 : 0}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stock" className="mt-0 p-4 sm:p-6 space-y-3">
            {stockRows.map((row) => (
              <div
                key={`${row.location}-${row.label}`}
                className="rounded-2xl border bg-background p-3.5 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold truncate">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {row.location}
                  </div>
                  <div
                    className="mt-1 flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: row.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: row.color }} />
                    {row.label}
                  </div>
                </div>
                <span className="text-base font-bold shrink-0">{row.qty} {part?.unit ?? 'EA'}</span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="movements" className="mt-0 p-4 sm:p-6">
            {partTxns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No movements yet this session.</p>
            ) : (
              <div className="space-y-3">
                {partTxns.map((t) => (
                  <div key={t.id} className="rounded-2xl border bg-background p-3.5 flex items-center justify-between gap-3 shadow-sm">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold capitalize">
                        {t.type === 'receive' ? 'Received' : t.direction === 'add' ? 'Adjusted +' : 'Adjusted −'}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {t.location} · {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="text-base font-bold shrink-0">{t.qty}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="allocations" className="mt-0 p-4 sm:p-6">
            {record.allocated > 0 ? (
              <div className="rounded-2xl border bg-background p-3.5 flex items-center justify-between text-sm shadow-sm">
                <span className="text-muted-foreground">Reserved against BOM demand</span>
                <span className="font-semibold">{record.allocated} {part?.unit ?? 'EA'}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nothing allocated.</p>
            )}
          </TabsContent>

          <TabsContent value="where-used" className="mt-0 p-4 sm:p-6">
            {whereUsed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Not referenced in the BOM.</p>
            ) : (
              <div className="space-y-3">
                {whereUsed.map((w, i) => (
                  <div key={i} className="rounded-2xl border bg-background p-3.5 flex items-center justify-between gap-3 shadow-sm">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {w.levelLabel && <span className="text-muted-foreground">{w.levelLabel} — </span>}
                        {w.name}
                      </div>
                      {w.designators && (
                        <div className="mt-1 text-xs text-muted-foreground truncate">{w.designators}</div>
                      )}
                    </div>
                    <span className="text-base font-bold shrink-0">{w.qty} {w.uom}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="supply" className="mt-0 p-4 sm:p-6">
            {record.onOrder > 0 ? (
              <div className="rounded-2xl border bg-background p-3.5 space-y-2 text-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">On order</span>
                  <span className="font-semibold">{record.onOrder} {part?.unit ?? 'EA'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lead time</span>
                  <span className="font-medium">{formatLeadTime(record.leadTimeDays)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nothing on order.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
