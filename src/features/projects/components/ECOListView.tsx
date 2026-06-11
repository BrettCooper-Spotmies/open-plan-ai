import { useState } from 'react';
import {
  GitMerge, GitBranch, Clock, ClipboardCheck,
  Boxes, Calendar, ChevronRight, CheckCircle,
} from 'lucide-react';
import {
  ECOListItem, MAIN_STATUSES, ECO_TYPE_LABEL, REASON_LABEL,
  MODULE_COLORS,
  statusMeta, priorityMeta, changeClassMeta, effectivityText,
  buildDetail, fromApiEcoListItem,
} from './ecoData';
import { ECOAvatar, StatusPill } from './ECOShared';
import { cn } from '@/lib/utils';
import { useECOList, useECOStats } from '@/hooks/useECOs';

// ── KPI stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, iconColor, accent, loading,
}: {
  label: string; value: number; sub: string;
  icon: React.ElementType; iconColor: string; accent?: boolean; loading?: boolean;
}) {
  return (
    <div className={cn(
      'bg-card border rounded-lg p-4 flex-1 min-w-[140px]',
      accent ? 'border-blue-500/25' : 'border-border',
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
      </div>
      <div className="text-[26px] font-bold leading-tight mb-0.5" style={{ color: accent ? '#2563EB' : undefined }}>
        {loading ? <span className="inline-block w-8 h-7 rounded bg-muted/60 animate-pulse" /> : value}
      </div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function ECORow({
  eco, selected, onSelect, onOpen,
}: {
  eco: ECOListItem; selected: boolean;
  onSelect: () => void; onOpen: () => void;
}) {
  const sm = statusMeta(eco.status);
  const pm = priorityMeta(eco.priority);

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={cn(
        'px-3.5 py-3 rounded-lg border cursor-pointer transition-all',
        selected
          ? 'border-blue-500/50 bg-blue-500/5'
          : 'border-border hover:bg-accent/30',
      )}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[12px] font-mono font-semibold text-blue-500 whitespace-nowrap">
              {eco.num}
            </span>
            <StatusPill meta={pm} />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {ECO_TYPE_LABEL[eco.type]}
            </span>
          </div>
          <div className="text-[14px] font-medium text-foreground truncate">{eco.title}</div>
        </div>
        <StatusPill meta={sm} />
      </div>
      <div className="flex gap-3 items-center text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <ECOAvatar name={eco.owner} size={16} />
          {eco.owner}
        </span>
        <span className="flex items-center gap-1">
          <Boxes className="w-3 h-3" />
          {eco.parts} parts
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {eco.target}
        </span>
        {eco.revFrom && eco.revTo && (
          <span className="font-mono text-muted-foreground/70">Rev {eco.revFrom}→{eco.revTo}</span>
        )}
      </div>
    </div>
  );
}

// ── Preview panel ─────────────────────────────────────────────────────────────

function PreviewPanel({ eco, onOpen }: { eco: ECOListItem; onOpen: () => void }) {
  const sm = statusMeta(eco.status);
  const pm = priorityMeta(eco.priority);
  const cm = changeClassMeta(eco.changeClass);
  const detail = buildDetail(eco);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[13px] font-mono font-semibold text-blue-500">{eco.num}</span>
        <StatusPill meta={sm} />
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        <div>
          <div className="text-[15px] font-semibold text-foreground mb-1.5">{eco.title}</div>
          <div className="text-[12px] text-muted-foreground leading-relaxed">{eco.desc}</div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <StatusPill meta={pm} />
          <StatusPill meta={cm} />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
            {ECO_TYPE_LABEL[eco.type]}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
            {REASON_LABEL[eco.reason]}
          </span>
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {([
            ['Owner', eco.owner],
            ['Originator', eco.originator],
            ['Effectivity', effectivityText(eco.effectivity)],
            ['ECO Rev', eco.revFrom && eco.revTo ? `${eco.revFrom} → ${eco.revTo}` : '—'],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 mb-0.5">{k}</div>
              <div className="text-[12px] font-medium text-foreground">{v}</div>
            </div>
          ))}
        </div>

        {eco.modules.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
              Affected Modules
            </div>
            <div className="flex flex-wrap gap-1.5">
              {eco.modules.map(m => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background: (MODULE_COLORS[m] ?? '#6B7280') + '22',
                    color: MODULE_COLORS[m] ?? '#6B7280',
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2.5">
            Approval Pipeline
          </div>
          <div className="flex flex-col gap-2.5">
            {detail.steps.map((p) => {
              const done   = p.decision === 'APPROVED';
              const active = p.decision === 'ACTIVE';
              const rej    = p.decision === 'REJECTED';
              return (
                <div key={p.order} className="flex items-center gap-2.5">
                  <ECOAvatar name={p.name} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-foreground truncate">{p.stage}</div>
                    <div className="text-[10px] text-muted-foreground">{p.name}</div>
                  </div>
                  {done
                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#16A34A' }} />
                    : rej
                    ? <span className="w-3.5 h-3.5 rounded-full bg-red-500/20 border border-red-500/40 shrink-0" />
                    : active
                    ? <Clock className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    : <span className="w-3 h-3 rounded-full border border-muted-foreground/30 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onOpen}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
        >
          Open Change Order <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── ECOListView ───────────────────────────────────────────────────────────────

export function ECOListView({
  projectId,
  onOpen,
}: {
  projectId: string;
  onOpen: (eco: ECOListItem) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fStatus, setFStatus]     = useState<string>('ALL');
  const [fPriority, setFPriority] = useState<string>('ALL');

  const apiFilters: Record<string, string> = {};
  if (fStatus   !== 'ALL') apiFilters.status   = fStatus.toLowerCase();
  if (fPriority !== 'ALL') apiFilters.priority = fPriority.toLowerCase();

  const { data: listData, isLoading: listLoading } = useECOList(projectId, apiFilters);
  const { data: stats, isLoading: statsLoading }   = useECOStats(projectId);

  const list: ECOListItem[] = (listData?.data ?? []).map(fromApiEcoListItem);

  const effectiveSelectedId = selectedId ?? list[0]?.id ?? null;
  const selected = list.find(e => e.id === effectiveSelectedId) ?? list[0] ?? null;

  const Sel = ({
    value, onChange, opts, allLabel,
  }: {
    value: string; onChange: (v: string) => void; opts: string[]; allLabel: string;
  }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-card border border-border rounded-md text-foreground text-[12px] px-2.5 py-1.5 outline-none cursor-pointer font-[inherit] appearance-none"
    >
      <option value="ALL">{allLabel}</option>
      {opts.map(o => (
        <option key={o} value={o} className="bg-card">
          {(o.charAt(0) + o.slice(1).toLowerCase()).replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden text-foreground">
      {/* KPI cards */}
      <div className="shrink-0 px-6 pt-4 pb-3">
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Open ECOs"           value={stats?.openEcos ?? 0}           sub="Across the program"     icon={GitMerge}       iconColor="#2563EB" accent    loading={statsLoading} />
          <StatCard label="In Review"           value={stats?.inReview ?? 0}           sub="Awaiting sign-off"       icon={Clock}          iconColor="#F59E0B"           loading={statsLoading} />
          <StatCard label="Awaiting My Action"  value={stats?.awaitingMyAction ?? 0}   sub="You are active approver" icon={ClipboardCheck} iconColor="#DC2626"           loading={statsLoading} />
          <StatCard label="Released This Month" value={stats?.releasedThisMonth ?? 0}  sub="ECNs generated"          icon={GitBranch}      iconColor="#16A34A"           loading={statsLoading} />
        </div>
      </div>

      {/* List + preview */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
          {/* Left: list */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3 flex-wrap">
              <span className="text-[13px] font-semibold">
                Change Orders{' '}
                <span className="font-normal text-muted-foreground">
                  · {listLoading ? '…' : list.length}
                </span>
              </span>
              <div className="flex gap-2 items-center">
                <Sel value={fStatus}   onChange={setFStatus}   opts={MAIN_STATUSES}                          allLabel="All statuses" />
                <Sel value={fPriority} onChange={setFPriority} opts={['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']} allLabel="All priorities" />
              </div>
            </div>
            <div className="p-2.5 flex flex-col gap-2">
              {listLoading && (
                <div className="py-10 text-center text-[12px] text-muted-foreground">
                  Loading change orders…
                </div>
              )}
              {!listLoading && list.map(eco => (
                <ECORow
                  key={eco.id}
                  eco={eco}
                  selected={effectiveSelectedId === eco.id}
                  onSelect={() => setSelectedId(eco.id)}
                  onOpen={() => onOpen(eco)}
                />
              ))}
              {!listLoading && list.length === 0 && (
                <div className="py-10 text-center text-[12px] text-muted-foreground">
                  No change orders match these filters.
                </div>
              )}
            </div>
          </div>

          {/* Right: preview */}
          {selected && (
            <PreviewPanel eco={selected} onOpen={() => onOpen(selected)} />
          )}
          {!selected && !listLoading && (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-[12px] text-muted-foreground">
              Select a change order to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
