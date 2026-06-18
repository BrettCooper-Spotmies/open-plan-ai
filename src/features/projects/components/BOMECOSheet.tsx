import { useState, useMemo } from 'react';
import {
  GitMerge, X, AlertCircle, ChevronDown, Check, CheckCircle, Clock,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  ECOType, ECOReason, ECOPriority, ImpactLevel,
  ECO_TYPE_LABEL, REASON_LABEL, PRIORITY_LABEL, IMPACT_LABEL,
  PipelineStep, PIPELINE_TEMPLATE,
} from './ecoData';
import { ECOAvatar } from './ECOShared';
import { useCreateECO } from '@/hooks/useECOs';
import { BOMNode, BOMStatus, BOM_CAT_META } from './bomData';
import { toast } from 'sonner';

// ── Local helpers ─────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-muted/40 border border-border rounded-md text-foreground text-[13px] px-3 py-2 outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 font-[inherit]';

function FL({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input {...props} className={cn('h-8 text-sm bg-muted border-border focus-visible:ring-1', props.className)} />
  );
}

function FSelect<T extends string>({
  value, onChange, options, labels,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="w-full bg-muted/40 border border-border rounded-md text-foreground text-[13px] px-3 py-2 outline-none focus:border-primary/40 cursor-pointer appearance-none font-[inherit]"
    >
      {options.map(o => (
        <option key={o} value={o} className="bg-card">{labels[o] ?? o}</option>
      ))}
    </select>
  );
}

const UOM_OPTIONS = ['EA', 'SET', 'LIC', 'KG', 'M', 'FT', 'PCS', 'LOT'];

// ── Impact area options ───────────────────────────────────────────────────────

const IMPACT_AREA_OPTIONS = [
  'schedule', 'cost', 'quality', 'safety', 'compliance',
  'software', 'firmware', 'manufacturing', 'procurement', 'reliability', 'other',
] as const;
type ImpactArea = typeof IMPACT_AREA_OPTIONS[number];
const IMPACT_AREA_LABEL: Record<ImpactArea, string> = {
  schedule: 'Schedule',
  cost: 'Cost',
  quality: 'Quality',
  safety: 'Safety',
  compliance: 'Compliance',
  software: 'Software',
  firmware: 'Firmware',
  manufacturing: 'Manufacturing',
  procurement: 'Procurement',
  reliability: 'Reliability',
  other: 'Other',
};

// ── Pipeline step with justification ─────────────────────────────────────────

interface PipelineStepLocal extends PipelineStep {
  justification: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function BOMECOSheet({
  open,
  onClose,
  node,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  node: BOMNode;
  projectId: string;
}) {
  const createMutation = useCreateECO(projectId);
  const meta = BOM_CAT_META[node.cat] ?? BOM_CAT_META.assembly;

  // ── Part Details editable state (pre-filled from node) ──
  const [desc, setDesc] = useState(node.desc ?? '');
  const [status, setStatus] = useState<BOMStatus>(node.status ?? 'pending');
  const [mpn, setMpn] = useState(node.mpn ?? '');
  const [manufacturer, setManufacturer] = useState(node.manufacturer ?? '');
  const [distributor, setDistributor] = useState(node.distributor ?? '');
  const [price, setPrice] = useState(node.price != null ? String(node.price) : '');
  const [leadTime, setLeadTime] = useState(node.leadTime != null ? String(node.leadTime) : '');
  const [qty, setQty] = useState(node.qty != null ? String(node.qty) : '');
  const [uom, setUom] = useState(node.uom ?? 'EA');

  // ── ECO meta state ──
  const [ecoTitle, setEcoTitle] = useState('');
  const [revFrom, setRevFrom] = useState(node.rev ?? 'A');
  const [revTo, setRevTo] = useState('');

  // ── Impact tab state ──
  const [impactArea, setImpactArea] = useState<ImpactArea>('schedule');
  const [impactLevel, setImpactLevel] = useState<ImpactLevel>('MEDIUM');
  const [impactDesc, setImpactDesc] = useState('');

  // ── Reason tab state ──
  const [changeType, setChangeType] = useState<ECOType>('DESIGN_CHANGE');
  const [reasonCode, setReasonCode] = useState<ECOReason>('PERFORMANCE');
  const [priority, setPriority] = useState<ECOPriority>('MEDIUM');
  const [reasonDesc, setReasonDesc] = useState('');

  // ── Approval tab state ──
  const defaultOrder = useMemo(() => {
    const m: Record<string, number> = {};
    PIPELINE_TEMPLATE.forEach((s, i) => { m[s.stage] = i; });
    return m;
  }, []);

  const [pipeline, setPipeline] = useState<PipelineStepLocal[]>(
    PIPELINE_TEMPLATE.map(s => ({ ...s, justification: s.optionalReason ?? '' })),
  );

  const stageMoved = (p: PipelineStep, idx: number) =>
    defaultOrder[p.stage] !== undefined && defaultOrder[p.stage] !== idx;

  const pipelineValid = pipeline.every((p, idx) => {
    const needsReason = p.optional || stageMoved(p, idx);
    return !needsReason || (p.justification ?? '').trim().length > 0;
  });

  const canSubmit = ecoTitle.trim() && pipeline.length >= 1 && pipelineValid;

  // ── Submit ──
  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await createMutation.mutateAsync({
        title: ecoTitle.trim(),
        description: reasonDesc || null,
        type: changeType.toLowerCase(),
        reason: reasonCode.toLowerCase(),
        priority: priority.toLowerCase(),
        changeClass: 'II',
        revFrom: revFrom || null,
        revTo: revTo || null,
        scheduleImpact: impactLevel.toLowerCase(),
        impactArea,
        certNotes: impactDesc || null,
        parts: node._partId ? [{
          partId: node._partId,
          bomNodeId: node.id,
          impactLevel: impactLevel.toLowerCase(),
          disposition: 'use_as_is',
          notes: null,
        }] : [],
        pipelineSteps: pipeline.map((p, i) => ({
          order: i + 1,
          stage: p.stage,
          stageLabel: p.stage,
          approverName: p.name ?? null,
          approverRole: p.role ?? null,
          isOptional: p.optional ?? false,
          optionalReason: p.optionalReason ?? null,
          justification: p.justification || null,
        })),
      });
      toast.success('ECO created successfully');
      onClose();
    } catch {
      toast.error('Failed to create ECO');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-[1050px] w-[90vw] p-0 gap-0 flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh', minHeight: '70vh' }}
      >
        {/* Header */}
        <DialogHeader className="px-7 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <GitMerge className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold leading-none">
                  New Engineering Change Order
                </DialogTitle>
                <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-mono font-medium shrink-0">
                  {node.pn}
                </span>
              </div>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                Propose a change to this part · ECO number assigned on save
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="part" className="flex flex-col flex-1 overflow-hidden">
          <div className="px-7 pt-3 pb-0 border-b border-border shrink-0">
            <TabsList className="bg-transparent h-auto p-0 gap-0 w-full justify-start rounded-none">
              {(['part', 'impact', 'reason', 'approval'] as const).map(t => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent text-muted-foreground text-[13px] font-medium px-4 py-2 capitalize"
                >
                  {t === 'part' ? 'Part Details' : t.charAt(0).toUpperCase() + t.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Part Details tab */}
          <TabsContent value="part" className="flex-1 min-h-0 relative mt-0">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="px-7 py-5 flex flex-col gap-5">

                {/* ECO meta — always at top so it's never hidden below fold */}
                <FL label="ECO Title" required>
                  <FInput
                    value={ecoTitle}
                    onChange={e => setEcoTitle(e.target.value)}
                    placeholder="e.g. Motor Housing Rev B Redesign"
                  />
                </FL>

                <div className="grid grid-cols-2 gap-4">
                  <FL label="Rev From">
                    <FInput
                      value={revFrom}
                      onChange={e => setRevFrom(e.target.value)}
                      placeholder="e.g. A"
                    />
                  </FL>
                  <FL label="Rev To">
                    <FInput
                      value={revTo}
                      onChange={e => setRevTo(e.target.value)}
                      placeholder="e.g. B"
                    />
                  </FL>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-3">
                  When the ECO is approved, a new BOM revision will be created automatically using the "Rev To" value.
                </p>

                <div className="border-t border-border/60 pt-4 flex flex-col gap-4">
                  {/* Category badge + Part Number (read-only identifier) */}
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider"
                      style={{ background: `${meta.tint}20`, color: meta.tint }}
                    >
                      <span className="w-2 h-2 rounded-sm inline-block" style={{ background: meta.tint }} />
                      {meta.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      Part&nbsp;<span className="font-mono font-semibold text-foreground">{node.pn}</span>
                      &nbsp;· BOM Level {node.level}
                    </span>
                  </div>

                  {/* Description */}
                  <FL label="Description">
                    <Textarea
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Brief technical description of the part"
                      className="text-sm bg-muted border-border resize-none"
                      rows={3}
                    />
                  </FL>

                  {/* Sourcing grid */}
                  <div className="grid grid-cols-3 gap-x-5 gap-y-4">
                    <FL label="Manufacturer" className="col-span-3">
                      <FInput
                        value={manufacturer}
                        onChange={e => setManufacturer(e.target.value)}
                        placeholder="e.g. Texas Instruments"
                      />
                    </FL>
                    <FL label="Manufacturer PN (MPN)">
                      <FInput
                        value={mpn}
                        onChange={e => setMpn(e.target.value)}
                        placeholder="e.g. TI-A4B2"
                        className="font-mono"
                      />
                    </FL>
                    <FL label="Supplier / Distributor">
                      <FInput
                        value={distributor}
                        onChange={e => setDistributor(e.target.value)}
                        placeholder="e.g. Digi-Key"
                      />
                    </FL>
                    <FL label="Unit Price ($)">
                      <FInput
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </FL>
                    <FL label="Lead Time (weeks)">
                      <FInput
                        value={leadTime}
                        onChange={e => setLeadTime(e.target.value)}
                        type="number"
                        placeholder="8"
                      />
                    </FL>
                    <FL label="Quantity">
                      <FInput
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        type="number"
                        placeholder="1"
                      />
                    </FL>
                    <FL label="Unit of Measure (UOM)" className="col-span-3">
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {UOM_OPTIONS.map(u => (
                          <button
                            key={u}
                            onClick={() => setUom(u)}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-xs font-medium border cursor-pointer transition-colors font-[inherit]',
                              uom === u
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-card text-muted-foreground border-border hover:bg-muted'
                            )}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </FL>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Impact tab */}
          <TabsContent value="impact" className="flex-1 min-h-0 relative mt-0">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="px-7 py-5 flex flex-col gap-5">
                <p className="text-[13px] text-muted-foreground">
                  Describe the consequences of this engineering change on the product or project.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FL label="Impact Area">
                    <FSelect
                      value={impactArea}
                      onChange={setImpactArea}
                      options={IMPACT_AREA_OPTIONS}
                      labels={IMPACT_AREA_LABEL}
                    />
                  </FL>
                  <FL label="Impact Level">
                    <FSelect
                      value={impactLevel}
                      onChange={setImpactLevel}
                      options={(['HIGH', 'MEDIUM', 'LOW'] as ImpactLevel[])}
                      labels={IMPACT_LABEL}
                    />
                  </FL>
                </div>
                <FL label="Impact Description">
                  <textarea
                    value={impactDesc}
                    onChange={e => setImpactDesc(e.target.value)}
                    placeholder="Describe the full impact of this change — schedule effects, cost consequences, quality implications, safety considerations, etc."
                    rows={6}
                    className={cn(inputCls, 'resize-none')}
                  />
                </FL>
              </div>
            </div>
          </TabsContent>

          {/* Reason tab */}
          <TabsContent value="reason" className="flex-1 min-h-0 relative mt-0">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="px-7 py-5 flex flex-col gap-5">
                <p className="text-[13px] text-muted-foreground">
                  Specify why this engineering change is needed.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <FL label="Change Type">
                    <FSelect
                      value={changeType}
                      onChange={setChangeType}
                      options={Object.keys(ECO_TYPE_LABEL) as ECOType[]}
                      labels={ECO_TYPE_LABEL}
                    />
                  </FL>
                  <FL label="Reason Code">
                    <FSelect
                      value={reasonCode}
                      onChange={setReasonCode}
                      options={Object.keys(REASON_LABEL) as ECOReason[]}
                      labels={REASON_LABEL}
                    />
                  </FL>
                  <FL label="Priority">
                    <FSelect
                      value={priority}
                      onChange={setPriority}
                      options={(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ECOPriority[])}
                      labels={PRIORITY_LABEL}
                    />
                  </FL>
                </div>
                <FL label="Reason Description">
                  <textarea
                    value={reasonDesc}
                    onChange={e => setReasonDesc(e.target.value)}
                    placeholder="Explain in detail why this change is necessary — root cause, customer feedback, regulatory requirement, etc."
                    rows={6}
                    className={cn(inputCls, 'resize-none')}
                  />
                </FL>
              </div>
            </div>
          </TabsContent>

          {/* Approval tab */}
          <TabsContent value="approval" className="flex-1 min-h-0 relative mt-0">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="px-7 py-5 flex flex-col gap-2.5">
                <p className="text-[13px] text-muted-foreground mb-1">
                  Ordered sign-off pipeline · reorder with arrows · mark stages optional. Any change to the default requires a justification.
                </p>
                {pipeline.map((p, idx) => {
                  const moved = stageMoved(p, idx);
                  const needsReason = p.optional || moved;
                  return (
                    <div
                      key={idx}
                      className="border rounded-lg px-3 py-2.5"
                      style={{ borderColor: needsReason ? '#F59E0B55' : 'hsl(var(--border))' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-muted-foreground w-5">{idx + 1}</span>
                        <ECOAvatar name={p.name} size={26} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                            {p.stage}
                            {moved && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ color: '#F59E0B', background: '#F59E0B1f', border: '1px solid #F59E0B33' }}
                              >
                                reordered
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{p.name} · {p.role}</div>
                        </div>
                        <button
                          onClick={() => setPipeline(pl => pl.map((x, i) => i === idx ? { ...x, optional: !x.optional } : x))}
                          className="px-2 py-1 rounded-full text-[10px] font-semibold transition-colors font-[inherit]"
                          style={{
                            background: p.optional ? '#F59E0B1a' : 'hsl(var(--muted))',
                            color: p.optional ? '#F59E0B' : undefined,
                            border: `1px solid ${p.optional ? '#F59E0B44' : 'hsl(var(--border))'}`,
                            cursor: 'pointer',
                          }}
                        >
                          {p.optional ? 'Optional' : 'Required'}
                        </button>
                        <div className="flex flex-col gap-0.5">
                          <button
                            disabled={idx === 0}
                            onClick={() => setPipeline(pl => { const n = [...pl]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; })}
                            className="disabled:opacity-30 cursor-pointer disabled:cursor-default"
                            style={{ background: 'none', border: 'none', padding: 0 }}
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                          </button>
                          <button
                            disabled={idx === pipeline.length - 1}
                            onClick={() => setPipeline(pl => { const n = [...pl]; [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; return n; })}
                            className="disabled:opacity-30 cursor-pointer disabled:cursor-default"
                            style={{ background: 'none', border: 'none', padding: 0 }}
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <button
                          onClick={() => setPipeline(pl => pl.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {needsReason && (
                        <div className="mt-2.5 pt-2.5 border-t border-dashed border-border/60">
                          <div
                            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                            style={{ color: '#F59E0B' }}
                          >
                            <AlertCircle className="w-3 h-3" />
                            {p.optional ? 'Why optional' : 'Why reordered'} — justification required
                          </div>
                          <input
                            value={p.justification ?? ''}
                            onChange={e => setPipeline(pl => pl.map((x, i) => i === idx ? { ...x, justification: e.target.value } : x))}
                            placeholder={p.optional ? `e.g. ${p.stage} waived — low geometric risk` : 'e.g. moved Final ahead of QA per program waiver'}
                            className={inputCls}
                            style={{ borderColor: (p.justification ?? '').trim() ? undefined : '#F59E0B88' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {priority === 'LOW' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                    <AlertCircle className="w-3 h-3" style={{ color: '#F59E0B' }} />
                    Low priority — optional stages may be auto-skipped at submit.
                  </div>
                )}
                {priority === 'CRITICAL' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                    <AlertCircle className="w-3 h-3" style={{ color: '#DC2626' }} />
                    Critical — full pipeline incl. QA + final is enforced.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-border flex items-center justify-between gap-4 shrink-0 bg-card">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            {canSubmit && (
              <>
                <Check className="w-3.5 h-3.5" style={{ color: '#16A34A' }} />
                <span>Ready to create ECO</span>
              </>
            )}
            {!canSubmit && !ecoTitle.trim() && (
              <>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#F59E0B' }} />
                <span>Enter an ECO title in the <strong>Part Details</strong> tab</span>
              </>
            )}
            {!canSubmit && ecoTitle.trim() && pipeline.length < 1 && (
              <>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#F59E0B' }} />
                <span>At least 1 approval stage is required</span>
              </>
            )}
            {!canSubmit && ecoTitle.trim() && pipeline.length >= 1 && !pipelineValid && (
              <>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#F59E0B' }} />
                <span>Optional or reordered stages need a justification</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md text-sm font-medium border border-border bg-transparent text-foreground hover:bg-muted transition-colors font-[inherit]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createMutation.isPending}
              className="px-4 py-1.5 rounded-md text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-[inherit]"
            >
              {createMutation.isPending ? 'Creating…' : 'Create ECO'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
