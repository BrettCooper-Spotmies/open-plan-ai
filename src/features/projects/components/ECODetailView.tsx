import { useState, Fragment } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  ChevronLeft, ChevronRight, GitMerge, GitBranch, Check, CheckCircle,
  XCircle, Clock, Lock, AlertCircle, Boxes, Info, DollarSign, Flag,
  Package, Shield, Cpu, Scissors, RefreshCw, Send, Download, Edit,
  History, Link2, X, Pause, Plus, ClipboardCheck,
} from 'lucide-react';
import {
  ECOListItem, ECODetail, PipelineStep,
  ECO_TYPE_LABEL, REASON_LABEL, CHANGE_CLASS_LABEL, EFFECTIVITY_LABEL,
  MODULE_COLORS, ACTIVITY_META, PIPELINE_TEMPLATE,
  statusMeta, priorityMeta, changeClassMeta, changeMeta, impactMeta, dispositionMeta,
  effectivityText, lifecycleIndex, buildDetail, topAssemblies,
  ECOStatus, DecisionType,
} from './ecoData';
import { ECOAvatar, StatusPill } from './ECOShared';
import { cn } from '@/lib/utils';

// ── Lifecycle tracker ─────────────────────────────────────────────────────────

const LC_NODES = [
  { key: 'DRAFT', label: 'Draft', icon: Edit },
  { key: 'IN_REVIEW', label: 'In Review', icon: ClipboardCheck },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle },
  { key: 'RELEASED', label: 'Released', icon: GitBranch, sub: 'ECN' },
  { key: 'VERIFIED', label: 'Verified', icon: Shield },
  { key: 'CLOSED', label: 'Closed', icon: Check },
] as const;

function LifecycleTracker({ status }: { status: ECOStatus }) {
  const cur = lifecycleIndex(status);
  const offTrack =
    status === 'REWORK' ? { at: 1, label: 'Rework', color: '#f97316' }
      : status === 'ON_HOLD' ? { at: 1, label: 'On Hold', color: '#F59E0B' }
        : null;

  return (
    <div className="bg-card border border-border rounded-lg px-6 py-5 mb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="text-[14px] font-semibold text-foreground">Change Lifecycle</div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Approval authorizes release · release ≠ start of work
        </div>
      </div>
      <div className="flex items-start">
        {LC_NODES.map((n, i) => {
          const done = i < cur;
          const here = i === cur;
          const isOff = !!offTrack && offTrack.at === i && here;
          const NodeIcon = isOff ? RefreshCw : n.icon;
          return (
            <Fragment key={n.key}>
              {/* Node column */}
              <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 76 }}>
                <div
                  className={cn(
                    'rounded-full flex items-center justify-center shrink-0 transition-all',
                    here ? 'w-11 h-11' : 'w-9 h-9',
                  )}
                  style={{
                    background: done ? '#16A34A' : here ? 'hsl(var(--primary))' : 'transparent',
                    border: done || here ? 'none' : '1.5px solid hsl(var(--border))',
                    boxShadow: here ? '0 0 0 4px hsl(var(--primary)/0.15)' : undefined,
                  }}
                >
                  {done
                    ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    : <NodeIcon
                        className={here ? 'w-5 h-5' : 'w-4 h-4'}
                        style={{ color: here ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))' }}
                      />
                  }
                </div>
                <span
                  className="text-[11px] text-center leading-tight w-full"
                  style={{
                    fontWeight: here ? 600 : 400,
                    color: here ? 'hsl(var(--primary))' : done ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {isOff ? offTrack!.label : n.label}
                </span>
                {'sub' in n && n.sub && (
                  <span className="text-[10px] text-muted-foreground -mt-1.5 leading-none">{n.sub}</span>
                )}
              </div>
              {/* Connector line between nodes */}
              {i < LC_NODES.length - 1 && (
                <div
                  className="h-0.5 rounded flex-1 mt-[22px]"
                  style={{ background: i < cur ? '#16A34A' : 'hsl(var(--border))' }}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Approval pipeline ─────────────────────────────────────────────────────────

function ApprovalPipeline({
  detail,
  onDecision,
}: {
  detail: ECODetail;
  onDecision: (kind: 'approve' | 'reject', comment: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [err, setErr] = useState(false);

  const dotFor = (decision: DecisionType | undefined) => {
    if (decision === 'APPROVED') return { color: '#16A34A', Icon: Check };
    if (decision === 'REJECTED') return { color: '#DC2626', Icon: X };
    if (decision === 'ACTIVE') return { color: '#2563EB', Icon: null };
    if (decision === 'HOLD') return { color: '#F59E0B', Icon: Pause };
    return { color: '#6B7280', Icon: null };
  };

  const submit = (kind: 'approve' | 'reject') => {
    if (kind === 'reject' && !comment.trim()) { setErr(true); return; }
    onDecision(kind, comment.trim());
    setComment(''); setErr(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg px-5 py-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[14px] font-semibold text-foreground">Approval Pipeline</div>
        <div className="text-[12px] text-muted-foreground">
          {detail.steps.filter(s => s.decision === 'APPROVED').length} of {detail.steps.length} approved · single active approver
        </div>
      </div>

      {/* Steps strip — each card is flex-1 so all 4 share equal width */}
      <div className="flex items-stretch py-4">
        {detail.steps.map((s, i) => {
          const { color, Icon } = dotFor(s.decision);
          const active = s.decision === 'ACTIVE';
          return (
            <Fragment key={s.order}>
              <div
                className="flex-1 min-w-0 border rounded-lg px-4 py-3.5"
                style={{
                  background: active
                    ? 'hsl(var(--primary)/0.06)'
                    : s.decision === 'APPROVED' ? 'rgba(22,163,74,0.05)'
                      : s.decision === 'REJECTED' ? 'rgba(220,38,38,0.05)'
                        : 'hsl(var(--muted)/0.3)',
                  borderColor: active ? 'hsl(var(--primary)/0.35)' : 'hsl(var(--border))',
                }}
              >
                {/* Stage label + status dot */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest truncate"
                    style={{ color }}
                  >
                    {s.stage}
                  </span>
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: color }}
                  >
                    {Icon
                      ? <Icon className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                      : active
                        ? <div className="w-2 h-2 rounded-full bg-white" />
                        : <div className="w-1.5 h-1.5 rounded-full bg-white/50" />}
                  </div>
                </div>
                {/* Approver */}
                <div className="flex items-center gap-2 mb-1.5">
                  <ECOAvatar name={s.name} size={22} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.role}</div>
                  </div>
                </div>
                {/* Status line */}
                <div className="text-[12px] font-medium mt-1" style={{ color }}>
                  {s.decision === 'APPROVED'
                    ? `Approved · ${s.date}`
                    : s.decision === 'ACTIVE'
                      ? s.date === 'Revising' ? 'Revising artifacts' : `In review · ${s.date}`
                      : s.decision === 'REJECTED'
                        ? `Rejected · ${s.date}`
                        : s.decision === 'HOLD'
                          ? 'On hold'
                          : s.date}
                </div>
                {/* Optional badge */}
                {s.optional && (
                  <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B40' }}
                    >
                      Optional
                    </span>
                    {s.optionalReason && (
                      <div className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{s.optionalReason}</div>
                    )}
                  </div>
                )}
              </div>
              {/* Chevron separator */}
              {i < detail.steps.length - 1 && (
                <div className="flex items-center shrink-0 px-1.5">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Rejection history */}
      {detail.rejections.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg mb-3" style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.22)' }}>
          <RefreshCw className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#f97316' }} />
          <div>
            <div className="text-[12px] font-semibold text-foreground">
              Rejected {detail.rejections.length === 1 ? 'once' : `${detail.rejections.length} times`} — last at {detail.rejections[detail.rejections.length - 1].stage} · {detail.rejections[detail.rejections.length - 1].when}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {detail.rejections[detail.rejections.length - 1].by}: "{detail.rejections[detail.rejections.length - 1].reason}"
            </div>
          </div>
        </div>
      )}

      {/* Inline action */}
      {detail.steps.some(s => s.decision === 'ACTIVE') && detail.awaitingMe && (
        <div className="pt-4 border-t border-border">
          <div className="text-[12px] text-muted-foreground mb-2">
            You are the active approver for{' '}
            <strong className="text-foreground">{detail.steps.find(s => s.decision === 'ACTIVE')?.stage}</strong>.
            You are reviewing finished engineering artifacts — approve to advance, or reject to return them to the originator.
          </div>
          <textarea
            value={comment}
            onChange={e => { setComment(e.target.value); if (err) setErr(false); }}
            placeholder="Add a decision comment… (required to reject)"
            className={cn(
              'w-full bg-muted/40 border rounded-md text-foreground text-[13px] px-3 py-2.5 outline-none resize-none h-12 font-[inherit]',
              err ? 'border-red-500/60' : 'border-border focus:border-primary/40',
            )}
          />
          {err && (
            <div className="text-[11px] text-red-500 mt-1">A comment is required to reject — the originator needs to know what to revise.</div>
          )}
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => submit('approve')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold text-white transition-colors"
              style={{ background: '#16A34A' }}
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Approve step
            </button>
            <button
              onClick={() => submit('reject')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors"
              style={{ color: '#DC2626', border: '1px solid #DC262655', background: 'transparent' }}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              Reject → Rework
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Version diff table ────────────────────────────────────────────────────────

function VersionDiff({ detail }: { detail: ECODetail }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden min-w-0">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[14px] font-semibold text-foreground">
            Version Diff — Rev {detail.revFrom} vs Rev {detail.revTo}
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            Field-level change set · {detail.diff.length} parameters
          </div>
        </div>
        <div className="flex gap-4 text-[12px]">
          <span style={{ color: '#DC2626' }}>● Rev {detail.revFrom} (current)</span>
          <span style={{ color: '#16A34A' }}>● Rev {detail.revTo} (proposed)</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Parameter', `Rev ${detail.revFrom}`, `Rev ${detail.revTo}`, 'Change'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detail.diff.map((d, i) => {
              const tag = changeMeta(d.cls);
              const removed = d.cls === 'REMOVED';
              const added = d.cls === 'ADDED';
              return (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                >
                  <td className="px-4 py-2.5 text-muted-foreground w-44">{d.param}</td>
                  <td
                    className="px-4 py-2.5 border-l border-border/50"
                    style={{
                      color: '#DC2626',
                      background: 'rgba(220,38,38,0.04)',
                      textDecoration: removed ? 'line-through' : 'none',
                      opacity: added ? 0.45 : 1,
                    }}
                  >
                    {d.from}
                  </td>
                  <td
                    className="px-4 py-2.5 border-l border-border/50"
                    style={{
                      color: '#16A34A',
                      background: 'rgba(22,163,74,0.04)',
                      opacity: removed ? 0.45 : 1,
                    }}
                  >
                    {d.to}
                    {d.unit && <span className="text-muted-foreground"> {d.unit}</span>}
                  </td>
                  <td className="px-4 py-2.5 border-l border-border/50">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-medium"
                      style={{ background: tag.background, color: tag.color, border: tag.border }}
                    >
                      {tag.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Affected parts ────────────────────────────────────────────────────────────

function AffectedParts({ detail }: { detail: ECODetail }) {
  const sorted = [...detail.parts].sort((a, b) => (
    ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.impact] ?? 2) - ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b.impact] ?? 2)
  ));

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border flex justify-between items-center">
        <div>
          <div className="text-[14px] font-semibold text-foreground">Affected Parts</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            {detail.parts.length} parts · each carries its own revision
          </div>
        </div>
        <Boxes className="w-4 h-4 text-muted-foreground" />
      </div>
      {sorted.map((p, i) => {
        const im = impactMeta(p.impact);
        const dp = dispositionMeta(p.disp);
        const tops = topAssemblies(p);
        const revChanged = p.rev && p.rev.from !== p.rev.to;
        return (
          <div
            key={i}
            className="px-4 py-3 hover:bg-accent/20 transition-colors flex flex-col gap-1.5"
            style={{ borderBottom: i < sorted.length - 1 ? '1px solid hsl(var(--border)/0.5)' : 'none' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-mono font-semibold text-blue-500">{p.pn}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {p.rev && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: revChanged ? '#16A34A' : undefined,
                      background: 'hsl(var(--muted)/0.5)',
                      border: `1px solid ${revChanged ? '#16A34A44' : 'hsl(var(--border))'}`,
                    }}
                  >
                    {revChanged ? `Rev ${p.rev.from} → ${p.rev.to}` : `Rev ${p.rev.from} (no change)`}
                  </span>
                )}
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: im.background, color: im.color, border: im.border }}
                >
                  {im.label}
                </span>
              </div>
            </div>
            <span className="text-[12px] text-muted-foreground">{p.desc}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: dp.background, color: dp.color, border: dp.border }}
              >
                {dp.label}
              </span>
              {p.qty > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  · {p.qty} units affected{tops.length > 1 ? ' across all usages' : ''}
                </span>
              )}
              {tops.length > 1 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B44' }}
                >
                  used in {tops.length} assemblies
                </span>
              )}
            </div>
            {p.paths.length > 0 && (
              <div className="flex flex-col gap-1 mt-0.5">
                {p.paths.map((path, pi) => (
                  <div key={pi} className="flex items-center gap-1 flex-wrap">
                    <GitBranch className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-mono text-blue-500">{p.pn.split(' ')[0]}</span>
                    {path.map((node, ni) => (
                      <span key={ni} className="flex items-center gap-1">
                        <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />
                        <span
                          className="text-[10px] px-1 py-0.5 rounded"
                          style={{
                            color: ni === path.length - 1 ? 'hsl(var(--foreground))' : undefined,
                            fontWeight: ni === path.length - 1 ? 600 : 400,
                            background: 'hsl(var(--muted)/0.5)',
                            border: `1px ${ni === path.length - 1 ? 'solid' : 'dashed'} hsl(var(--border))`,
                          }}
                        >
                          {node}
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="px-4 py-2 bg-muted/20 border-t border-border/50 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <GitBranch className="w-2.5 h-2.5" />
        Where-used paths auto-rolled up from BOM hierarchy to top-level assembly
      </div>
    </div>
  );
}

// ── Impact assessment ─────────────────────────────────────────────────────────

function ImpactAssessment({ detail }: { detail: ECODetail }) {
  const im = detail.impact;
  const sched = impactMeta(im.schedule);

  const Row = ({ icon: Icon, label, children }: {
    icon: React.ElementType; label: string; children: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/50">
      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className="text-[12px] font-medium text-foreground text-right">{children}</span>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[14px] font-semibold text-foreground">Impact Assessment</div>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: sched.background, color: sched.color, border: sched.border }}
        >
          Schedule {sched.label}
        </span>
      </div>
      <Row icon={Flag} label="Affected Milestones">
        <div className="flex flex-col items-end gap-1">
          {im.milestones.length
            ? im.milestones.map(m => <span key={m} className="text-blue-500 cursor-pointer">{m}</span>)
            : <span className="text-muted-foreground">None</span>}
        </div>
      </Row>
      <Row icon={DollarSign} label="Unit Cost Δ">
        <span style={{
          color: im.unitCostDelta > 0 ? '#F59E0B' : im.unitCostDelta < 0 ? '#16A34A' : undefined,
        }}>
          {im.unitCostDelta > 0 ? '+' : ''}${im.unitCostDelta.toFixed(2)}/unit
        </span>
      </Row>
      <Row icon={Package} label="One-Time Cost">
        {im.oneTimeCost > 0
          ? `$${im.oneTimeCost.toLocaleString()}`
          : <span className="text-muted-foreground">—</span>}
      </Row>
      <Row icon={Shield} label="Recertification">
        <div className="flex flex-col items-end gap-1">
          <span style={{ color: im.recert ? '#F59E0B' : undefined, fontWeight: im.recert ? 600 : 500 }}>
            {im.recert ? 'Required' : 'Not required'}
          </span>
          {im.recert && im.certNotes && (
            <span className="text-[10px] text-muted-foreground max-w-[170px]">{im.certNotes}</span>
          )}
        </div>
      </Row>
      <Row icon={Cpu} label="Firmware Coupling">
        <span style={{ color: im.firmware ? '#F59E0B' : undefined, fontWeight: im.firmware ? 600 : 500 }}>
          {im.firmware ? 'Yes — FW dependency' : 'None'}
        </span>
      </Row>
      <div className="flex items-start justify-between gap-3 pt-2">
        <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Boxes className="w-3.5 h-3.5" />
          Inventory Impact
        </span>
        <span className="text-[12px] font-medium text-foreground">
          {im.inventoryQty > 0 ? `${im.inventoryQty} units to rework/scrap` : <span className="text-muted-foreground">None</span>}
        </span>
      </div>
    </div>
  );
}

// ── Activity timeline ─────────────────────────────────────────────────────────

function ActivityTimeline({ detail }: { detail: ECODetail }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="text-[14px] font-semibold text-foreground">Activity</div>
        <span className="text-[11px] text-muted-foreground ml-auto">Append-only · ISO 9001 audit</span>
      </div>
      <div className="px-4 py-4">
        {detail.activity.map((a, i) => {
          const meta = ACTIVITY_META[a.action] ?? { icon: 'Activity', color: '#6B7280' };
          // Dynamic icon lookup
          const IconComp = (LucideIcons as Record<string, React.ElementType>)[meta.icon] ?? LucideIcons.Activity;
          const last = i === detail.activity.length - 1;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: meta.color + '22',
                    border: `1px solid ${meta.color}44`,
                  }}
                >
                  <IconComp className="w-3 h-3" style={{ color: meta.color }} />
                </div>
                {!last && <div className="w-px flex-1 bg-border/50 min-h-[14px]" />}
              </div>
              <div className={cn('min-w-0', last ? 'pb-0' : 'pb-4')}>
                <div className="text-[12px]">
                  <strong className="font-semibold text-foreground">{a.actor}</strong>
                  <span className="text-muted-foreground"> {a.action.replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="text-muted-foreground/60"> · {a.when}</span>
                </div>
                {a.note && (
                  <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{a.note}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ECN Release Modal ─────────────────────────────────────────────────────────

function ECNReleaseModal({
  detail,
  onClose,
  onReleased,
}: {
  detail: ECODetail;
  onClose: () => void;
  onReleased: (num: string) => void;
}) {
  const [released, setReleased] = useState(detail.status !== 'APPROVED');
  const ecn = detail.ecn;
  if (!ecn) return null;

  const revBumps = detail.parts.filter(p => p.rev && p.rev.from !== p.rev.to);
  const dispCounts = detail.parts.reduce<Record<string, number>>((acc, p) => {
    acc[p.disp] = (acc[p.disp] ?? 0) + 1; return acc;
  }, {});

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-[640px] max-w-full max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-foreground">
                {released ? 'ECN Released & Distributed' : 'Generate ECN — Release Change'}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {detail.num} → {ecn.num} · {released ? 'controlled / released' : 'approved, ready to release'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Info banner */}
          <div className="flex gap-3 p-3.5 rounded-lg" style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.22)' }}>
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-[12px] text-foreground leading-relaxed">
              The change is <strong>already approved</strong>. Generating the ECN releases it to manufacturing and suppliers and promotes the affected parts to released state at the effectivity cut-in. This is a controlled release — <strong>not</strong> another approval gate.
            </div>
          </div>

          {/* Milestone recalc */}
          {ecn.recalc.count > 0 ? (
            <div className="flex gap-3 p-3.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
              <div>
                <div className="text-[13px] font-semibold text-foreground">
                  {ecn.recalc.count} downstream milestone{ecn.recalc.count > 1 ? 's' : ''} shift by +{ecn.recalc.days} days
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  BOM-to-schedule recalculation moves the{' '}
                  <strong style={{ color: '#F59E0B' }}>{ecn.recalc.gate}</strong> gate. Review before confirming release.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 p-3.5 rounded-lg" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.25)' }}>
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
              <div className="text-[13px] text-foreground">No schedule impact — no downstream milestones shift on release.</div>
            </div>
          )}

          {/* Effectivity + on-release */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px] p-3.5 rounded-lg bg-muted/40 border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Effectivity Cut-in</div>
              <div className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-blue-500" />
                {effectivityText(detail.effectivity)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {EFFECTIVITY_LABEL[detail.effectivity.type]} · enforced by manufacturing
              </div>
            </div>
            <div className="flex-1 min-w-[180px] p-3.5 rounded-lg bg-muted/40 border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">On Release</div>
              <div className="text-[12px] text-foreground">
                Promotes {revBumps.length} part revision{revBumps.length !== 1 ? 's' : ''} to released · writes audit records
              </div>
            </div>
          </div>

          {/* Dispositions */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Dispositions to Execute</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dispCounts).map(([d, n]) => {
                const dm = dispositionMeta(d as any);
                return (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: dm.background, color: dm.color, border: dm.border }}
                  >
                    {dm.label} · {n}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Distribution */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Distribution List <span className="normal-case tracking-normal font-normal">· notified on release</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ecn.distribution.map((name, i) => (
                <div key={name} className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/50 border border-border">
                  <ECOAvatar name={name} size={20} />
                  <span className="text-[12px] text-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Implementation Tasks ({ecn.tasks.length}){' '}
              <span className="normal-case tracking-normal font-normal">· tracked to Verified</span>
            </div>
            <div className="flex flex-col gap-2">
              {ecn.tasks.map((t, i) => {
                const done = t.status === 'done';
                return (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/30 border border-border">
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{
                        border: `1.5px solid ${done ? '#16A34A' : 'hsl(var(--muted-foreground)/0.4)'}`,
                        background: done ? '#16A34A' : 'transparent',
                      }}
                    >
                      {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span
                      className="flex-1 text-[12px] text-foreground"
                      style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}
                    >
                      {t.task}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                      <ECOAvatar name={t.assignee} size={16} />
                      {t.assignee}
                    </div>
                    <span className="text-[11px] text-muted-foreground w-10 text-right shrink-0">{t.due}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-[13px] font-medium bg-muted/50 text-foreground border border-border hover:bg-accent transition-colors"
          >
            {released ? 'Close' : 'Cancel'}
          </button>
          {!released && (
            <button
              onClick={() => { setReleased(true); onReleased(ecn.num); }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Generate & Release ECN
            </button>
          )}
          {released && (
            <span
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold text-white"
              style={{ background: '#16A34A' }}
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Released · {ecn.num} distributed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Verify modal ──────────────────────────────────────────────────────────────

function VerifyModal({
  detail,
  onClose,
  onConfirm,
}: {
  detail: ECODetail;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <div onClick={e => e.stopPropagation()} className="w-[480px] max-w-full bg-card border border-border rounded-xl shadow-2xl">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#9333EA22' }}>
            <Shield className="w-4 h-4" style={{ color: '#9333EA' }} />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-foreground">Verify Implementation</div>
            <div className="text-[12px] text-muted-foreground">{detail.num} · {detail.ecn?.num ?? 'ECN'} released</div>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-[12px] text-muted-foreground leading-relaxed">
              Confirm the change was implemented and the effectivity cut-in is in effect. This is an implementation check — it does <strong className="text-foreground">not</strong> re-open the approval pipeline.
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Verification Note</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Rework complete on 240 cabinets; first S/N EVC-1450 built to Rev B; effectivity cut-in confirmed."
              className="w-full h-20 bg-muted/40 border border-border rounded-md text-foreground text-[13px] px-3 py-2 outline-none resize-none font-[inherit] focus:border-primary/40"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-[13px] font-medium bg-muted/50 text-foreground border border-border hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note.trim())}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold text-white transition-colors"
            style={{ background: '#9333EA' }}
          >
            <Shield className="w-3.5 h-3.5" />
            Mark Verified
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Header action definitions ─────────────────────────────────────────────────

function headerActions(status: ECOStatus) {
  const ghost = 'ghost' as const;
  const primary = 'primary' as const;
  switch (status) {
    case 'DRAFT': return [{ k: 'edit', label: 'Edit Draft', icon: Edit, kind: ghost }, { k: 'submit', label: 'Submit for Review', icon: Send, kind: primary }];
    case 'IN_REVIEW': return [{ k: 'export', label: 'Export PDF', icon: Download, kind: ghost }];
    case 'ON_HOLD': return [{ k: 'export', label: 'Export PDF', icon: Download, kind: ghost }, { k: 'resume', label: 'Resume Review', icon: RefreshCw, kind: primary }];
    case 'REWORK': return [{ k: 'export', label: 'Export PDF', icon: Download, kind: ghost }, { k: 'resubmit', label: 'Revise & Resubmit', icon: RefreshCw, kind: primary }];
    case 'APPROVED': return [{ k: 'export', label: 'Export PDF', icon: Download, kind: ghost }, { k: 'generate', label: 'Generate ECN', icon: GitBranch, kind: primary }];
    case 'RELEASED': return [{ k: 'ecn', label: 'View ECN', icon: Download, kind: ghost }, { k: 'verify', label: 'Mark Verified', icon: Shield, kind: primary }];
    case 'VERIFIED': return [{ k: 'ecn', label: 'View ECN', icon: Download, kind: ghost }, { k: 'close', label: 'Close ECO', icon: Check, kind: primary }];
    default: return [{ k: 'export', label: 'Export PDF', icon: Download, kind: ghost }];
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-5 py-2.5 text-[13px] font-medium text-foreground shadow-xl z-[300] flex items-center gap-2">
      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#16A34A' }} />
      {message}
    </div>
  );
}

// ── ECODetailView ─────────────────────────────────────────────────────────────

export function ECODetailView({
  eco,
  onBack,
  onEdit,
}: {
  eco: ECOListItem;
  onBack: () => void;
  onEdit?: (eco: ECOListItem) => void;
}) {
  const [detail, setDetail] = useState<ECODetail>(() => buildDetail(eco));
  const [ecnOpen, setEcnOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const sm = statusMeta(detail.status);
  const pm = priorityMeta(detail.priority);
  const cm = changeClassMeta(detail.changeClass);

  const handleDecision = (kind: 'approve' | 'reject', comment: string) => {
    setDetail(prev => {
      const active = prev.steps.find(s => s.decision === 'ACTIVE') ?? {} as PipelineStep;
      if (kind === 'approve') {
        const steps = prev.steps.map(s =>
          s.decision === 'ACTIVE' ? { ...s, decision: 'APPROVED' as DecisionType, date: 'Just now' } : s,
        );
        const nextIdx = steps.findIndex(s => s.decision === 'PENDING');
        const allDone = nextIdx === -1;
        if (!allDone) steps[nextIdx] = { ...steps[nextIdx], decision: 'ACTIVE' as DecisionType, date: 'Just now' };
        const newAct = { actor: active.name ?? prev.owner, action: 'APPROVED', when: 'Just now', note: comment || 'Reviewed finished artifacts — approved.' };
        return { ...prev, steps, status: allDone ? 'APPROVED' : prev.status, awaitingMe: false, activity: [newAct, ...prev.activity] };
      }
      const steps = prev.steps.map((s, i) => ({
        ...s,
        decision: (i === 0 ? 'ACTIVE' : 'PENDING') as DecisionType,
        date: i === 0 ? 'Revising' : 'Pending',
      }));
      const rej = { stage: active.stage ?? 'Review', by: active.name ?? prev.owner, when: 'Just now', reason: comment };
      const newAct = { actor: active.name ?? prev.owner, action: 'REJECTED', when: 'Just now', note: `Rework at ${active.stage ?? 'review'} — ${comment}` };
      return {
        ...prev, steps, status: 'REWORK' as ECOStatus, owner: prev.originator, awaitingMe: false,
        rejections: [...(prev.rejections ?? []), rej], activity: [newAct, ...prev.activity],
      };
    });
    flash(kind === 'approve' ? 'Step approved — pipeline advanced' : 'Returned to originator for artifact rework');
  };

  const onAction = (k: string) => {
    if (k === 'edit') { onEdit?.(eco); return; }
    if (k === 'generate' || k === 'ecn') { setEcnOpen(true); return; }
    if (k === 'verify') { setVerifyOpen(true); return; }
    if (k === 'submit') { setDetail(p => ({ ...p, status: 'IN_REVIEW' })); flash('Submitted for review'); return; }
    if (k === 'resume') { setDetail(p => ({ ...p, status: 'IN_REVIEW' })); flash('Review resumed'); return; }
    if (k === 'resubmit') {
      setDetail(p => {
        const steps = p.steps.map((s, i) => ({
          ...s,
          decision: (i === 0 ? 'APPROVED' : i === 1 ? 'ACTIVE' : 'PENDING') as DecisionType,
          date: i === 0 ? 'Apr 14' : i === 1 ? 'Just now' : 'Pending',
        }));
        return {
          ...p, status: 'IN_REVIEW' as ECOStatus, awaitingMe: true, steps,
          activity: [{ actor: p.originator, action: 'RESUBMITTED', when: 'Just now', note: 'Revised artifacts resubmitted — re-entering the pipeline from stage 1.' }, ...p.activity],
        };
      });
      flash('Resubmitted — back in review from stage 1'); return;
    }
    if (k === 'close') {
      setDetail(p => ({
        ...p, status: 'CLOSED' as ECOStatus,
        activity: [{ actor: p.owner, action: 'CLOSED', when: 'Just now', note: 'ECO/ECN closed — change complete.' }, ...p.activity],
      }));
      flash('ECO closed'); return;
    }
    flash('Action: ' + k);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background px-6 py-5 pb-12 h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-3">
        <span className="text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors">EV Charging Station</span>
        <ChevronRight className="w-3 h-3" />
        <span onClick={onBack} className="text-blue-500 cursor-pointer hover:underline">Engineering Changes</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{detail.num}</span>
      </div>

      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-md text-[12px] font-medium bg-card text-muted-foreground border border-border hover:bg-accent/50 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back to changes
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <GitMerge className="w-4.5 h-4.5 text-blue-500" />
            <span className="text-[13px] font-mono font-semibold text-blue-500">{detail.num}</span>
            <h1 className="text-[20px] font-semibold text-foreground">{detail.title}</h1>
            <StatusPill meta={sm} />
            <StatusPill meta={pm} />
            <StatusPill meta={cm} />
          </div>
          <div className="flex items-center gap-4 flex-wrap mb-2 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Link2 className="w-3 h-3" />
              Originating ECR:{' '}
              {detail.ecr
                ? <span className="text-blue-500 font-semibold font-mono cursor-pointer">{detail.ecr}</span>
                : <span className="text-muted-foreground/60">— (created directly)</span>}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Scissors className="w-3 h-3 text-blue-500" />
              Effectivity: <span className="text-foreground font-semibold">{effectivityText(detail.effectivity)}</span>
              <span className="text-muted-foreground/60">· {EFFECTIVITY_LABEL[detail.effectivity.type]}</span>
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground max-w-3xl leading-relaxed">{detail.desc}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {headerActions(detail.status).map(a => (
            <button
              key={a.k}
              onClick={() => onAction(a.k)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors font-[inherit]',
                a.kind === 'primary'
                  ? 'font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-none'
                  : 'font-medium bg-card text-foreground border border-border hover:bg-accent/50',
              )}
            >
              <a.icon className="w-3.5 h-3.5" strokeWidth={2} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex gap-5 flex-wrap text-[12px] text-muted-foreground mb-2 pt-3 border-t border-border">
        {([
          ['Type', ECO_TYPE_LABEL[detail.type]],
          ['Reason', REASON_LABEL[detail.reason]],
          ['Originator', detail.originator],
          ['Change Owner', detail.owner],
          ['Initiated', detail.created],
          ['Affected Parts', String(detail.parts.length)],
          ['ECO Revision', `${detail.revFrom} → ${detail.revTo}`],
        ] as [string, string][]).map(([k, v]) => (
          <span key={k}>
            <span className="text-muted-foreground/60">{k}: </span>
            <span className="text-foreground font-medium">{v}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 mb-5">
        <Info className="w-3 h-3" />
        ECO revision tracks this change order; each affected part carries its own revision (see Affected Parts).
      </div>

      {/* Affected modules */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {detail.modules.map(m => (
          <span
            key={m}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: (MODULE_COLORS[m] ?? '#6B7280') + '22', color: MODULE_COLORS[m] ?? '#6B7280' }}
          >
            {m}
          </span>
        ))}
      </div>

      <LifecycleTracker status={detail.status} />
      <ApprovalPipeline detail={detail} onDecision={handleDecision} />

      {/* Two-column content */}
      <div className="flex gap-4 items-start flex-wrap">
        <div className="flex-[2] min-w-0 flex flex-col gap-4">
          <VersionDiff detail={detail} />
          <ActivityTimeline detail={detail} />
        </div>
        <div className="flex-1 min-w-[280px] flex flex-col gap-4">
          <ImpactAssessment detail={detail} />
          <AffectedParts detail={detail} />
        </div>
      </div>

      {ecnOpen && (
        <ECNReleaseModal
          detail={detail}
          onClose={() => setEcnOpen(false)}
          onReleased={num => {
            setDetail(p => ({
              ...p, status: 'RELEASED' as ECOStatus,
              activity: [{
                actor: p.owner, action: 'RELEASED', when: 'Just now',
                note: `ECN ${num} generated & distributed — change promoted to released state.`,
              }, ...p.activity],
            }));
          }}
        />
      )}

      {verifyOpen && (
        <VerifyModal
          detail={detail}
          onClose={() => setVerifyOpen(false)}
          onConfirm={note => {
            setDetail(p => ({
              ...p, status: 'VERIFIED' as ECOStatus,
              activity: [{
                actor: p.owner, action: 'VERIFIED', when: 'Just now',
                note: note || 'Implementation verified — effectivity cut-in confirmed.',
              }, ...p.activity],
            }));
            setVerifyOpen(false);
            flash('Implementation verified');
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}
