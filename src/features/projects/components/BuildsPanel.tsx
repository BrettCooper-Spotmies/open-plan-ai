import { useState } from 'react';
import {
  CheckCircle, Truck, Flag, ArrowRight, ClipboardCheck, Plus,
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

// Fixed accent per build phase — purely visual grouping, matches the design system's build type chips.
const BUILD_TYPE_TINT: Record<string, string> = { EVT: '#7C3AED', DVT: '#2563EB', PVT: '#16A34A' };

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
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Builds list panel */}
      <div className="w-full lg:w-72 shrink-0 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Builds</h3>
          <Button size="icon" variant="outline" className="h-7 w-7" disabled title="Coming soon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {builds.map((b) => {
            const isShort = b.shortLines.length > 0;
            const active = b.id === selectedBuild.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBuildId(b.id)}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: isShort ? '#DC2626' : '#16A34A' }} />
                    <span className="text-sm font-bold text-foreground truncate">{b.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold shrink-0"
                    style={{ color: BUILD_TYPE_TINT[b.type] ?? undefined, borderColor: `${BUILD_TYPE_TINT[b.type] ?? '#64748B'}40`, background: `${BUILD_TYPE_TINT[b.type] ?? '#64748B'}14` }}
                  >
                    {b.type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-1.5">
                  {b.units} units · {b.bomRev} · {formatShortDate(b.targetDate)}
                </div>
                {isShort ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                    <Flag className="h-3 w-3" /> {b.daysLate}d past target
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#16A34A' }}>
                    <CheckCircle className="h-3 w-3" /> Complete
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-4 min-w-0">
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
