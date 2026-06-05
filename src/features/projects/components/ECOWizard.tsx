import { useState, useRef, useMemo } from 'react';
import {
  GitMerge, Check, X, Plus, ChevronDown, Lock, AlertCircle,
  Upload, FileText, Image, Box, Boxes, Package, Scissors,
} from 'lucide-react';
import {
  ECOType, ECOReason, ECOPriority, ChangeClass, EffectivityType, ImpactLevel, ECODisposition,
  ECO_TYPE_LABEL, REASON_LABEL, PRIORITY_LABEL, CHANGE_CLASS_LABEL,
  EFFECTIVITY_LABEL, IMPACT_LABEL, DISPOSITION_LABEL, CHANGE_LABEL_MAP, ChangeLabel,
  PipelineStep, PIPELINE_TEMPLATE,
} from './ecoData';
import { ECOAvatar } from './ECOShared';
import { cn } from '@/lib/utils';

// ── BOM pool (simulates where-used rollup) ────────────────────────────────────

const BOM_POOL = [
  { pn: 'EV-ENC-041', desc: 'Sheet Metal Cabinet IP54',       whereUsed: ['EV-ASM-100 Main Assembly'] },
  { pn: 'EV-ENC-042', desc: 'Front Door Panel',               whereUsed: ['EV-ASM-110 Door Frame'] },
  { pn: 'EV-PCB-002', desc: 'Main Controller PCBA',           whereUsed: ['EV-ASM-100 Main Assembly'] },
  { pn: 'EV-CHD-034', desc: 'Cable Management Bracket',       whereUsed: ['EV-ASM-120 Harness Sub-Assy'] },
  { pn: 'EV-SAF-062', desc: 'Emergency Stop Button',          whereUsed: ['EV-ASM-110 Door Frame'] },
  { pn: 'EV-IC-U2',   desc: 'USB-C PD Controller PMIC',      whereUsed: ['EV-PCB-002 Main Controller PCBA'] },
];

// ── Attachment file type helper ───────────────────────────────────────────────

function fileKind(name: string) {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (ext === 'pdf')                                    return { Icon: FileText, color: '#DC2626', tag: 'PDF' };
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return { Icon: Image,    color: '#9333EA', tag: ext.toUpperCase() };
  if (['step','stp','iges','igs','sldprt','sldasm','dwg','dxf','3mf','stl'].includes(ext))
                                                        return { Icon: Box,     color: '#0891B2', tag: 'CAD' };
  if (['xls','xlsx','csv'].includes(ext))               return { Icon: Boxes,   color: '#16A34A', tag: 'SHEET' };
  if (['zip','rar','7z'].includes(ext))                 return { Icon: Package, color: '#D97706', tag: 'ZIP' };
  return { Icon: FileText, color: '#6B7280', tag: ext ? ext.toUpperCase() : 'FILE' };
}

function fmtSize(b: number) {
  if (b < 1024)     return b + ' B';
  if (b < 1048576)  return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ── Shared field label ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{children}</div>;
}

// ── Shared select ─────────────────────────────────────────────────────────────

function EcoSelect<T extends string>({
  value, onChange, options, labels,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
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

// ── Input ─────────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-muted/40 border border-border rounded-md text-foreground text-[13px] px-3 py-2 outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 font-[inherit]';

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Basics', 'Items', 'Details', 'Impact', 'Approval'];

function Stepper({ step, setStep }: { step: number; setStep: (i: number) => void }) {
  return (
    <div className="flex gap-1">
      {STEPS.map((s, i) => (
        <div key={s} onClick={() => setStep(i)} className="flex-1 cursor-pointer pb-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold"
              style={{
                background: i < step ? '#16A34A' : i === step ? '#2563EB' : 'hsl(var(--muted))',
                color: i <= step ? '#fff' : undefined,
                border: i > step ? '1px solid hsl(var(--border))' : 'none',
              }}
            >
              {i < step ? <Check className="w-3 h-3 text-white" strokeWidth={3} /> : i + 1}
            </div>
            <span
              className="text-[12px] whitespace-nowrap"
              style={{ fontWeight: i === step ? 600 : 500, color: i === step ? undefined : undefined }}
            >
              {s}
            </span>
          </div>
          <div
            className="h-0.5 rounded"
            style={{ background: i <= step ? '#2563EB' : 'hsl(var(--border))' }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Wizard state types ────────────────────────────────────────────────────────

interface BasicsState {
  title: string; description: string;
  type: ECOType; priority: ECOPriority; reason: ECOReason;
  changeClass: ChangeClass;
  revFrom: string; revTo: string; ecr: string;
  effType: EffectivityType; effValue: string;
}

interface ItemState {
  pn: string; desc: string; impact: ImpactLevel;
  disp: ECODisposition; whereUsed: string[];
}

interface DiffRowState {
  param: string; from: string; to: string; cls: ChangeLabel;
}

interface AttachmentState { name: string; size: number }

interface ImpactState {
  schedule: ImpactLevel; recert: boolean; firmware: boolean;
  unitCostDelta: string; oneTimeCost: string;
}

interface PipelineStepWizard extends PipelineStep {
  justification: string;
}

// ── ECOWizard ─────────────────────────────────────────────────────────────────

export function ECOWizard({
  seed,
  onClose,
}: {
  seed: null | { title?: string; desc?: string; type?: ECOType; priority?: ECOPriority; reason?: ECOReason; revFrom?: string; revTo?: string; ecr?: string; changeClass?: ChangeClass };
  onClose: (result?: { saved: boolean }) => void;
}) {
  const [step, setStep] = useState(0);

  // Step 1 — Basics
  const [basics, setBasics] = useState<BasicsState>({
    title: seed?.title ?? '', description: seed?.desc ?? '',
    type: seed?.type ?? 'DESIGN_CHANGE', priority: seed?.priority ?? 'MEDIUM',
    reason: seed?.reason ?? 'PERFORMANCE', changeClass: seed?.changeClass ?? 'II',
    revFrom: seed?.revFrom ?? 'A', revTo: seed?.revTo ?? 'B', ecr: seed?.ecr ?? '',
    effType: 'DATE', effValue: '',
  });

  // Step 2 — Affected items
  const [items, setItems] = useState<ItemState[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addItem = (p: typeof BOM_POOL[number]) => {
    setItems(prev =>
      prev.find(x => x.pn === p.pn)
        ? prev
        : [...prev, { pn: p.pn, desc: p.desc, impact: 'MEDIUM', disp: 'REWORK', whereUsed: p.whereUsed }],
    );
    setPickerOpen(false);
  };

  // Step 3 — Diff rows + attachments
  const [diffRows, setDiffRows] = useState<DiffRowState[]>([]);
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next = Array.from(fileList).map(f => ({ name: f.name, size: f.size }));
    setAttachments(prev => {
      const names = new Set(prev.map(a => a.name));
      return [...prev, ...next.filter(f => !names.has(f.name))];
    });
  };

  // Step 4 — Impact
  const [impact, setImpact] = useState<ImpactState>({
    schedule: 'MEDIUM', recert: false, firmware: false,
    unitCostDelta: '', oneTimeCost: '',
  });

  // Step 5 — Pipeline
  const defaultOrder = useMemo(() => {
    const m: Record<string, number> = {};
    PIPELINE_TEMPLATE.forEach((s, i) => { m[s.stage] = i; });
    return m;
  }, []);

  const [pipeline, setPipeline] = useState<PipelineStepWizard[]>(
    PIPELINE_TEMPLATE.map(s => ({ ...s, justification: s.optionalReason ?? '' })),
  );

  // Lock QA & Final Approval for Class I
  const lockStage = (stage: string) =>
    basics.changeClass === 'I' && (stage === 'Quality Assurance' || stage === 'Final Approval');

  const stageMoved = (p: PipelineStep, idx: number) =>
    defaultOrder[p.stage] !== undefined && defaultOrder[p.stage] !== idx;

  const pipelineValid = pipeline.every((p, idx) => {
    const needsReason = p.optional || stageMoved(p, idx);
    return !needsReason || (p.justification ?? '').trim().length > 0;
  });

  const canSubmit = basics.title.trim() && items.length >= 1 && pipeline.length >= 1 && pipelineValid;

  // ── Render helpers ────────────────────────────────────────────────────────

  const upItem = <K extends keyof ItemState>(idx: number, key: K, val: ItemState[K]) =>
    setItems(prev => prev.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));

  const upRow = <K extends keyof DiffRowState>(idx: number, key: K, val: DiffRowState[K]) =>
    setDiffRows(prev => prev.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));

  // ── Step content ──────────────────────────────────────────────────────────

  const StepBasics = (
    <div className="flex flex-col gap-3.5">
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          value={basics.title}
          onChange={e => setBasics({ ...basics, title: e.target.value })}
          placeholder="e.g. Motor Housing Redesign"
          className={inputCls}
        />
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          value={basics.description}
          onChange={e => setBasics({ ...basics, description: e.target.value })}
          placeholder="Short summary of the change intent"
          className={cn(inputCls, 'h-16 resize-none')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Change Type</FieldLabel>
          <EcoSelect value={basics.type} onChange={v => setBasics({ ...basics, type: v })} options={Object.keys(ECO_TYPE_LABEL) as ECOType[]} labels={ECO_TYPE_LABEL} />
        </div>
        <div>
          <FieldLabel>Reason Code</FieldLabel>
          <EcoSelect value={basics.reason} onChange={v => setBasics({ ...basics, reason: v })} options={Object.keys(REASON_LABEL) as ECOReason[]} labels={REASON_LABEL} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <EcoSelect value={basics.priority} onChange={v => setBasics({ ...basics, priority: v })} options={Object.keys(PRIORITY_LABEL) as ECOPriority[]} labels={PRIORITY_LABEL} />
        </div>
        <div>
          <FieldLabel>Change Classification</FieldLabel>
          <EcoSelect value={basics.changeClass} onChange={v => setBasics({ ...basics, changeClass: v })} options={Object.keys(CHANGE_CLASS_LABEL) as ChangeClass[]} labels={CHANGE_CLASS_LABEL} />
        </div>
      </div>
      {basics.changeClass === 'I' && (
        <div className="flex items-center gap-1.5 text-[11px] -mt-1" style={{ color: '#DC2626' }}>
          <Lock className="w-3 h-3" />
          Class I locks QA &amp; Final Approval as mandatory in the pipeline.
        </div>
      )}
      <div className="grid grid-cols-[80px_80px_1fr] gap-3">
        <div>
          <FieldLabel>Rev From</FieldLabel>
          <input value={basics.revFrom} onChange={e => setBasics({ ...basics, revFrom: e.target.value })} className={inputCls} />
        </div>
        <div>
          <FieldLabel>Rev To</FieldLabel>
          <input value={basics.revTo} onChange={e => setBasics({ ...basics, revTo: e.target.value })} className={inputCls} />
        </div>
        <div>
          <FieldLabel>Originating ECR</FieldLabel>
          <input value={basics.ecr} onChange={e => setBasics({ ...basics, ecr: e.target.value })} placeholder="ECR-2026-088 (optional)" className={inputCls} />
        </div>
      </div>
      {/* Effectivity */}
      <div>
        <FieldLabel>Effectivity (Cut-in)</FieldLabel>
        <div className="flex gap-2 items-center">
          <div className="flex bg-muted/40 border border-border rounded-md p-0.5 shrink-0">
            {(['DATE', 'SERIAL', 'LOT'] as EffectivityType[]).map(t => (
              <button
                key={t}
                onClick={() => setBasics({ ...basics, effType: t, effValue: '' })}
                className="px-2.5 py-1.5 rounded text-[12px] font-semibold transition-colors font-[inherit]"
                style={{
                  background: basics.effType === t ? '#2563EB' : 'transparent',
                  color: basics.effType === t ? '#fff' : undefined,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t === 'DATE' ? 'Date' : t === 'SERIAL' ? 'S/N break' : 'Lot break'}
              </button>
            ))}
          </div>
          <input
            value={basics.effValue}
            onChange={e => setBasics({ ...basics, effValue: e.target.value })}
            placeholder={
              basics.effType === 'DATE' ? 'Jun 02, 2026'
              : basics.effType === 'SERIAL' ? 'Effective from S/N EVC-1450'
              : 'Effective from Lot 2026-W18'
            }
            className={cn(inputCls, 'flex-1')}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
          <Scissors className="w-2.5 h-2.5" />
          Manufacturing enforces this cut-in point when the ECN releases.
        </div>
      </div>
    </div>
  );

  const StepItems = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          {items.length} affected part{items.length !== 1 ? 's' : ''} · where-used auto-rolls up from BOM
        </div>
        <button
          onClick={() => setPickerOpen(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-[inherit]"
        >
          <Plus className="w-3 h-3" />
          Add part
        </button>
      </div>
      {pickerOpen && (
        <div className="border border-border rounded-lg overflow-hidden">
          {BOM_POOL.map(p => (
            <div
              key={p.pn}
              onClick={() => addItem(p)}
              className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/30 transition-colors"
            >
              <div>
                <span className="text-[12px] font-mono font-semibold text-blue-500">{p.pn}</span>
                <span className="text-[12px] text-muted-foreground ml-2.5">{p.desc}</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && !pickerOpen && (
        <div className="py-7 text-center border border-dashed border-border rounded-lg text-[12px] text-muted-foreground">
          No parts yet — at least one is required to submit.
        </div>
      )}
      {items.map((it, idx) => (
        <div key={it.pn} className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[12px] font-mono font-semibold text-blue-500">{it.pn}</span>
              <span className="text-[12px] text-muted-foreground ml-2">{it.desc}</span>
            </div>
            <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <EcoSelect value={it.impact} onChange={v => upItem(idx, 'impact', v)} options={Object.keys(IMPACT_LABEL) as ImpactLevel[]} labels={IMPACT_LABEL} />
            </div>
            <div className="flex-[1.4]">
              <EcoSelect value={it.disp} onChange={v => upItem(idx, 'disp', v)} options={Object.keys(DISPOSITION_LABEL) as ECODisposition[]} labels={DISPOSITION_LABEL} />
            </div>
          </div>
          {it.whereUsed.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {it.whereUsed.map(w => (
                <span key={w} className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50 border border-dashed border-border">{w}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const StepDetails = (
    <div className="flex flex-col gap-3">
      {/* Diff rows */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          Field-level Rev {basics.revFrom} → {basics.revTo} diff · {diffRows.length} row{diffRows.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setDiffRows(r => [...r, { param: '', from: '', to: '', cls: 'MODIFIED' }])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-[inherit]"
        >
          <Plus className="w-3 h-3" />
          Add row
        </button>
      </div>
      {diffRows.length > 0 && (
        <div className="flex gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
          <div className="flex-[1.2]">Parameter</div>
          <div className="flex-1">Rev {basics.revFrom}</div>
          <div className="flex-1">Rev {basics.revTo}</div>
          <div className="w-32">Class</div>
          <div className="w-5" />
        </div>
      )}
      {diffRows.map((r, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input value={r.param} onChange={e => upRow(idx, 'param', e.target.value)} placeholder="Parameter" className={cn(inputCls, 'flex-[1.2]')} />
          <input value={r.from}  onChange={e => upRow(idx, 'from',  e.target.value)} placeholder="from"      className={cn(inputCls, 'flex-1')} />
          <input value={r.to}    onChange={e => upRow(idx, 'to',    e.target.value)} placeholder="to"        className={cn(inputCls, 'flex-1')} />
          <div className="w-32">
            <EcoSelect value={r.cls} onChange={v => upRow(idx, 'cls', v)} options={Object.keys(CHANGE_LABEL_MAP) as ChangeLabel[]} labels={CHANGE_LABEL_MAP} />
          </div>
          <button onClick={() => setDiffRows(d => d.filter((_, i) => i !== idx))} className="w-5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {diffRows.length === 0 && (
        <div className="py-6 text-center border border-dashed border-border rounded-lg text-[12px] text-muted-foreground">
          Add the parameters that change between revisions.
        </div>
      )}

      {/* Attachments */}
      <div className="mt-2 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            Attachments
            <span className="text-muted-foreground font-normal">· {attachments.length}</span>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-muted/50 text-foreground border border-border hover:bg-accent/50 transition-colors font-[inherit]"
          >
            <Upload className="w-3 h-3 text-muted-foreground" />
            Browse
          </button>
        </div>
        <input
          ref={fileRef} type="file" multiple
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className="flex flex-col items-center gap-1.5 p-5 rounded-lg border-2 border-dashed cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? '#2563EB' : 'hsl(var(--border))',
            background: dragOver ? 'rgba(37,99,235,0.05)' : 'hsl(var(--muted)/0.3)',
          }}
        >
          <Upload className="w-5 h-5" style={{ color: dragOver ? '#2563EB' : undefined }} />
          <div className="text-[12px] text-muted-foreground text-center">
            <span className="text-blue-500 font-semibold">Click to upload</span> or drag &amp; drop
          </div>
          <div className="text-[10px] text-muted-foreground">Drawings, CAD (STEP/SLDPRT), PDFs, test reports, photos</div>
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2.5">
            {attachments.map((a, idx) => {
              const k = fileKind(a.name);
              return (
                <div key={a.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: k.color + '22', border: `1px solid ${k.color}44` }}
                  >
                    <k.Icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-foreground truncate">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground">{k.tag} · {fmtSize(a.size)}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter((_, i) => i !== idx)); }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const StepImpact = (
    <div className="flex flex-col gap-3.5">
      <div>
        <FieldLabel>Schedule Impact</FieldLabel>
        <EcoSelect value={impact.schedule} onChange={v => setImpact({ ...impact, schedule: v })} options={Object.keys(IMPACT_LABEL) as ImpactLevel[]} labels={IMPACT_LABEL} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Unit Cost Δ ($/unit)</FieldLabel>
          <input value={impact.unitCostDelta} onChange={e => setImpact({ ...impact, unitCostDelta: e.target.value })} placeholder="+4.55" className={inputCls} />
        </div>
        <div>
          <FieldLabel>One-Time Cost ($)</FieldLabel>
          <input value={impact.oneTimeCost} onChange={e => setImpact({ ...impact, oneTimeCost: e.target.value })} placeholder="12400" className={inputCls} />
        </div>
      </div>
      {([
        ['recert',  'Requires Recertification', 'CE / UL / ISO re-test needed'],
        ['firmware', 'Firmware Coupling',         'SW/FW dependency exists'],
      ] as [keyof ImpactState, string, string][]).map(([k, label, sub]) => (
        <div
          key={k}
          onClick={() => setImpact(prev => ({ ...prev, [k]: !prev[k] }))}
          className="flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all"
          style={{
            borderColor: 'hsl(var(--border))',
            background: impact[k] ? 'rgba(245,158,11,0.06)' : 'transparent',
          }}
        >
          <div>
            <div className="text-[13px] font-medium text-foreground">{label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
          </div>
          <div
            className="w-9 h-5 rounded-full relative transition-all shrink-0"
            style={{
              background: impact[k] ? '#F59E0B' : 'hsl(var(--muted))',
              border: `1px solid ${impact[k] ? '#F59E0B' : 'hsl(var(--border))'}`,
            }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: impact[k] ? '18px' : '2px' }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const StepApproval = (
    <div className="flex flex-col gap-2.5">
      <div className="text-[13px] text-muted-foreground mb-1">
        Ordered sign-off pipeline · reorder with arrows · mark stages optional. Any change to the default requires a justification.
      </div>
      {basics.changeClass === 'I' && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
          style={{ color: '#DC2626', background: '#DC262614', border: '1px solid #DC262633' }}
        >
          <Lock className="w-3 h-3 shrink-0" />
          Class I — Safety/Regulatory: QA and Final Approval are locked as mandatory and cannot be removed.
        </div>
      )}
      {pipeline.map((p, idx) => {
        const locked = lockStage(p.stage);
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
              {locked ? (
                <span
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold shrink-0"
                  style={{ background: '#DC262614', color: '#DC2626', border: '1px solid #DC262633' }}
                >
                  <Lock className="w-2.5 h-2.5" />
                  Required
                </span>
              ) : (
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
              )}
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
              {locked ? (
                <div className="w-4 flex justify-center">
                  <Lock className="w-3 h-3 text-muted-foreground/50" />
                </div>
              ) : (
                <button
                  onClick={() => setPipeline(pl => pl.filter((_, i) => i !== idx))}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
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
                  style={{
                    borderColor: (p.justification ?? '').trim() ? undefined : '#F59E0B88',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
      {basics.priority === 'LOW' && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <AlertCircle className="w-3 h-3" style={{ color: '#F59E0B' }} />
          Low priority — optional stages may be auto-skipped at submit.
        </div>
      )}
      {basics.priority === 'CRITICAL' && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <AlertCircle className="w-3 h-3" style={{ color: '#DC2626' }} />
          Critical — full pipeline incl. QA + final is enforced.
        </div>
      )}
    </div>
  );

  const stepContent = [StepBasics, StepItems, StepDetails, StepImpact, StepApproval][step];

  return (
    <div
      onClick={() => onClose()}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-[680px] max-w-full flex flex-col bg-card border border-border rounded-xl shadow-2xl"
        style={{ height: 'min(640px, 90vh)' }}
      >
        {/* Header + stepper */}
        <div className="px-5 pt-4 pb-0 border-b border-border">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <GitMerge className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-foreground">
                  {seed ? `Edit ECO` : 'New Engineering Change Order'}
                </div>
                <div className="text-[12px] text-muted-foreground">Draft · eco_number assigned on save</div>
              </div>
            </div>
            <button
              onClick={() => onClose()}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <Stepper step={step} setStep={setStep} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {stepContent}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
          <div
            className="text-[11px] flex items-center gap-1.5"
            style={{ color: canSubmit ? undefined : '#F59E0B' }}
          >
            {!canSubmit && <AlertCircle className="w-3 h-3" style={{ color: '#F59E0B' }} />}
            {canSubmit
              ? <span className="text-muted-foreground">Ready to save draft</span>
              : !pipelineValid
              ? 'Add a justification for each optional / reordered pipeline stage'
              : 'Need a title, ≥1 affected item and a pipeline to submit'}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-md text-[13px] font-medium bg-muted/50 text-foreground border border-border hover:bg-accent/50 transition-colors font-[inherit]"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 rounded-md text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-[inherit]"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => canSubmit && onClose({ saved: true })}
                disabled={!canSubmit}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors font-[inherit]',
                  canSubmit
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground cursor-default',
                )}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Save Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
