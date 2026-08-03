import { useState } from 'react';
import {
  CheckCircle, Truck, Flag, ArrowRight, ClipboardCheck,
  Zap, Cpu, Package, Box, Monitor, Shield, Layers, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getCategoryMeta } from './bomData';
import { CoveragePill, formatShortDate, type Build } from './inventoryData';

// Maps bomData's BOM_CAT_META.iconName strings to the actual icon component.
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = { Zap, Cpu, Package, Box, Monitor, Shield, Layers, Tag };

interface BuildsPanelProps {
  builds: Build[];
  onSelectPart: (partId: string) => void;
}

export function BuildsPanel({ builds, onSelectPart }: BuildsPanelProps) {
  const [selectedBuildId, setSelectedBuildId] = useState(builds[0]?.id);
  const selectedBuild = builds.find(b => b.id === selectedBuildId) ?? builds[0];

  if (!selectedBuild) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No builds yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {builds.map((b) => {
          const isShort = b.shortLines.length > 0;
          const active = b.id === selectedBuild.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBuildId(b.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: active ? 'currentColor' : (isShort ? '#DC2626' : '#16A34A') }}
              />
              {b.name}
              {isShort && <span className={active ? 'opacity-80' : 'text-destructive'}>· {b.daysLate}d</span>}
            </button>
          );
        })}
      </div>

      <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold">{selectedBuild.name}</h2>
          <Badge variant="outline">{selectedBuild.type}</Badge>
          {selectedBuild.shortLines.length === 0 && (
            <Badge className="gap-1 border-transparent" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>
              <CheckCircle className="h-3 w-3" /> Clear to build
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          BOM {selectedBuild.bomRev} · {selectedBuild.units} units · scrap {selectedBuild.scrapPct}% · linked to{' '}
          <span className="font-medium text-foreground">{selectedBuild.linkedMilestone}</span>
        </p>

        <div className="flex items-center justify-between gap-4 flex-wrap rounded-lg border p-3">
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Target build date</div>
            <div className="text-lg font-bold">{formatShortDate(selectedBuild.targetDate)}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-right">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Projected ready</div>
            <div className="text-lg font-bold" style={{ color: selectedBuild.daysLate > 0 ? '#DC2626' : '#16A34A' }}>
              {formatShortDate(selectedBuild.projectedDate)}
            </div>
            {selectedBuild.daysLate > 0 && (
              <div className="text-xs text-destructive">{selectedBuild.daysLate} days late</div>
            )}
          </div>
        </div>

        {selectedBuild.shortLines.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-sm">
            <Flag className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p>
              Shortage lead time pushes the projected ready date{' '}
              <span className="font-semibold text-destructive">{selectedBuild.daysLate} days</span> past target — milestone{' '}
              <span className="font-semibold">{selectedBuild.linkedMilestone}</span> is flagged at-risk on the schedule.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button disabled title="Coming soon">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Auto-allocate available
          </Button>
          <Button variant="outline" disabled title="Coming soon">
            <Truck className="h-4 w-4 mr-2" /> Generate shortage → Procurement
          </Button>
          <Button variant="outline" disabled title="Coming soon">
            <CheckCircle className="h-4 w-4 mr-2" /> Mark kitted
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3 py-2">BOM Line</TableHead>
                <TableHead className="px-3 py-2 text-right">Qty/Unit</TableHead>
                <TableHead className="px-3 py-2 text-right">Required</TableHead>
                <TableHead className="px-3 py-2 text-right">Available</TableHead>
                <TableHead className="px-3 py-2 text-right">Allocated</TableHead>
                <TableHead className="px-3 py-2 text-right">On Order</TableHead>
                <TableHead className="px-3 py-2 text-right">Shortfall</TableHead>
                <TableHead className="px-3 py-2">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedBuild.lines.map((l) => {
                const shortfall = l.required > l.available ? l.available - l.required : 0;
                const meta = getCategoryMeta(l.cat);
                const CategoryIcon = CATEGORY_ICON_MAP[meta.iconName] ?? Tag;
                return (
                  <TableRow key={l.partId} className="cursor-pointer" onClick={() => onSelectPart(l.partId)}>
                    <TableCell className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                          style={{ background: `${meta.tint}1a`, color: meta.tint }}
                        >
                          <CategoryIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-primary truncate">{l.pn}</div>
                          <div className="text-xs text-muted-foreground truncate">{l.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">{l.qtyPerUnit} {l.uom}</TableCell>
                    <TableCell className="px-3 py-2 text-right font-semibold">{l.required}</TableCell>
                    <TableCell className="px-3 py-2 text-right">{l.available}</TableCell>
                    <TableCell className="px-3 py-2 text-right">{l.allocated}</TableCell>
                    <TableCell className="px-3 py-2 text-right">{l.onOrder || '—'}</TableCell>
                    <TableCell className={cn('px-3 py-2 text-right', shortfall < 0 && 'text-destructive font-semibold')}>
                      {shortfall < 0 ? shortfall : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2"><CoveragePill status={l.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
