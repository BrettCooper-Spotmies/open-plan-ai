import { useMemo } from 'react';
import {
  Download, Upload, Pencil, ArrowLeftRight, ClipboardCheck, MapPin,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'p-0 overflow-y-auto overflow-x-hidden',
          isMobile
            ? 'inset-0 left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0'
            : 'max-w-3xl max-h-[85vh]'
        )}
      >
        <DialogTitle className="sr-only">{record.pn} — {record.name}</DialogTitle>

        <div className="min-w-0 p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
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
            <div className="min-w-0 flex-1 pr-8">
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

          <div className="grid grid-cols-3 gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-6 py-2">
            <StatItem label="On Hand" value={record.onHand} />
            <StatItem label="Allocated" value={record.allocated} />
            <StatItem label="Available" value={availableOf(record)} color={availableOf(record) < 0 ? '#DC2626' : '#16A34A'} />
            <StatItem label="On Order" value={record.onOrder} color={record.onOrder > 0 ? '#D97706' : undefined} />
            <StatItem label="Quarantine" value={record.quarantineQty ?? 0} />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Button className="min-w-0 px-2 sm:px-4" onClick={onReceive}>
              <Download className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Receive</span>
            </Button>
            <Button className="min-w-0 px-2 sm:px-4" variant="outline" onClick={onAdjust}>
              <Pencil className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Adjust</span>
            </Button>
            <Button className="min-w-0 px-2 sm:px-4" variant="outline" disabled title="Coming soon">
              <Upload className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Issue</span>
            </Button>
            <Button className="min-w-0 px-2 sm:px-4" variant="outline" disabled title="Coming soon">
              <ArrowLeftRight className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Transfer</span>
            </Button>
            <Button className="min-w-0 px-2 sm:px-4 col-span-2 sm:col-auto" variant="outline" disabled title="Coming soon">
              <ClipboardCheck className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Allocate</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="stock" className="min-w-0 border-t">
          <div className="px-4 sm:px-6 pt-3 overflow-x-auto no-scrollbar">
            <TabsList>
              <TabsTrigger value="stock">
                Stock <span className="ml-1.5 text-[11px] text-muted-foreground">{stockRows.length}</span>
              </TabsTrigger>
              <TabsTrigger value="movements">
                Movements <span className="ml-1.5 text-[11px] text-muted-foreground">{partTxns.length}</span>
              </TabsTrigger>
              <TabsTrigger value="allocations">
                Allocations <span className="ml-1.5 text-[11px] text-muted-foreground">{record.allocated > 0 ? 1 : 0}</span>
              </TabsTrigger>
              <TabsTrigger value="where-used">
                Where-used <span className="ml-1.5 text-[11px] text-muted-foreground">{whereUsed.length}</span>
              </TabsTrigger>
              <TabsTrigger value="supply">
                Supply <span className="ml-1.5 text-[11px] text-muted-foreground">{record.onOrder > 0 ? 1 : 0}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stock" className="mt-0 p-4 sm:p-6 space-y-3">
            {stockRows.map((row) => (
              <div key={`${row.location}-${row.label}`} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {row.location}
                  </span>
                  <span className="text-sm font-semibold">{row.qty} {part?.unit ?? 'EA'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: row.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.color }} />
                    {row.label}
                  </span>
                  <span className="text-sm font-medium">{row.qty}</span>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="movements" className="mt-0 p-4 sm:p-6">
            {partTxns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No movements yet this session.</p>
            ) : (
              <div className="space-y-2">
                {partTxns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <div className="font-medium capitalize">
                        {t.type === 'receive' ? 'Received' : t.direction === 'add' ? 'Adjusted +' : 'Adjusted −'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.location} · {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="font-semibold shrink-0">{t.qty}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="allocations" className="mt-0 p-4 sm:p-6">
            {record.allocated > 0 ? (
              <div className="rounded-lg border p-3 flex items-center justify-between text-sm">
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
              <div className="space-y-2">
                {whereUsed.map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {w.levelLabel && <span className="text-muted-foreground">{w.levelLabel} — </span>}
                        {w.name}
                      </div>
                      {w.designators && (
                        <div className="text-xs text-muted-foreground truncate">{w.designators}</div>
                      )}
                    </div>
                    <span className="font-semibold shrink-0">{w.qty} {w.uom}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="supply" className="mt-0 p-4 sm:p-6">
            {record.onOrder > 0 ? (
              <div className="rounded-lg border p-3 space-y-2 text-sm">
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
