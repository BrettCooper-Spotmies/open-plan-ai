import { useState, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  GitMerge, Check, X, Plus, ChevronDown, Lock, AlertCircle,
  Upload, FileText, Image, Box, Boxes, Package, Scissors,
} from 'lucide-react';
import {
  ECOType, ECOReason, ECOPriority, ChangeClass, EffectivityType, ImpactLevel, ECODisposition,
  ECO_TYPE_LABEL, REASON_LABEL, PRIORITY_LABEL, CHANGE_CLASS_LABEL,
  EFFECTIVITY_LABEL, IMPACT_LABEL, DISPOSITION_LABEL, CHANGE_LABEL_MAP, ChangeLabel,
  PipelineStep, PIPELINE_STAGE_DEFS,
} from './ecoData';
import { ECOAvatar } from './ECOShared';
import { cn } from '@/lib/utils';
import { useCreateECO, useUpdateECO, useECODetail } from '@/hooks/useECOs';
import { useBomTree } from '@/hooks/useBom';
import { useProjectMembers } from '@/hooks/useProjectTeam';
import { useAuth } from '@/modules/auth';
import { fromApiNode, bomFlatAll, bomPath } from './bomData';
import { REQS } from './requirementsData';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

// ── BOM parameter options for Details diff rows ───────────────────────────────

const BOM_PARAM_OPTIONS: { key: string; label: string }[] = [
  { key: 'name', label: 'Part Name' },
  { key: 'desc', label: 'Description' },
  { key: 'qty', label: 'Quantity' },
  { key: 'uom', label: 'Unit of Measure' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'rev', label: 'Revision' },
  { key: 'cat', label: 'Category' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'distributor', label: 'Distributor' },
  { key: 'price', label: 'Unit Price' },
  { key: 'leadTime', label: 'Lead Time (days)' },
  { key: 'mpn', label: 'MPN' },
];

const ECO_RECOMMENDED_PARAMS = [
  'Drawing Number',
  'Material',
  'Tolerance',
  'Surface Finish',
  'Coating / Treatment',
  'Weight (g)',
  'Operating Temperature',
  'Voltage Rating',
  'Current Rating',
  'Power Rating (W)',
  'Package Type',
  'Mounting Type',
  'Test Procedure',
  'Country of Origin',
];

const ALL_KNOWN_PARAM_LABELS = new Set([
  ...BOM_PARAM_OPTIONS.map(o => o.label),
  ...ECO_RECOMMENDED_PARAMS,
]);

// ── Searchable parameter combobox ─────────────────────────────────────────────

function ParamCombobox({
  value,
  onChange,
  onSelectOther,
  firstSelectedNode,
}: {
  value: string;
  onChange: (label: string, autoFrom: string) => void;
  onSelectOther: () => void;
  firstSelectedNode: Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel = value || '— select parameter —';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-between gap-1 flex-[1.2] bg-muted/40 border border-border rounded-md text-foreground text-[13px] px-3 py-2 outline-none focus:border-primary/40 cursor-pointer font-[inherit] min-w-0"
          style={{ color: value ? undefined : 'hsl(var(--muted-foreground))' }}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[260px]" align="start">
        <Command>
          <CommandInput placeholder="Search parameters…" />
          <CommandList>
            <CommandEmpty>No match — use Other to enter custom.</CommandEmpty>
            <CommandGroup heading="BOM Fields">
              {BOM_PARAM_OPTIONS.map(o => (
                <CommandItem
                  key={o.key}
                  value={o.label}
                  onSelect={() => {
                    const autoFrom = firstSelectedNode
                      ? String(firstSelectedNode[o.key] ?? '')
                      : '';
                    onChange(o.label, autoFrom);
                    setOpen(false);
                  }}
                >
                  {value === o.label && <Check className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Recommended">
              {ECO_RECOMMENDED_PARAMS.map(p => (
                <CommandItem
                  key={p}
                  value={p}
                  onSelect={() => {
                    onChange(p, '');
                    setOpen(false);
                  }}
                >
                  {value === p && <Check className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                  {p}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Custom">
              <CommandItem
                value="other"
                onSelect={() => {
                  onSelectOther();
                  setOpen(false);
                }}
              >
                Other…
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Attachment file type helper ───────────────────────────────────────────────

function fileKind(name: string) {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (ext === 'pdf') return { Icon: FileText, color: '#DC2626', tag: 'PDF' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return { Icon: Image, color: '#9333EA', tag: ext.toUpperCase() };
  if (['step', 'stp', 'iges', 'igs', 'sldprt', 'sldasm', 'dwg', 'dxf', '3mf', 'stl'].includes(ext))
    return { Icon: Box, color: '#0891B2', tag: 'CAD' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: Boxes, color: '#16A34A', tag: 'SHEET' };
  if (['zip', 'rar', '7z'].includes(ext)) return { Icon: Package, color: '#D97706', tag: 'ZIP' };
  return { Icon: FileText, color: '#6B7280', tag: ext ? ext.toUpperCase() : 'FILE' };
}

function fmtSize(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ── Shared field label ────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-0.5">
      {children}
      {required && <span style={{ color: '#DC2626' }}>*</span>}
    </div>
  );
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

const ECO_SELECT_CLS = 'w-full bg-muted/40 border border-border rounded-md text-foreground text-[13px] px-3 py-2 outline-none focus:border-primary/40 cursor-pointer appearance-none font-[inherit]';

const CUSTOM_SENTINEL = '__custom__';

function EcoSelectWithCustom({
  value, onChange, options, labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels: Record<string, string>;
}) {
  const isCustom = !!value && !options.includes(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === CUSTOM_SENTINEL) {
      setEditing(true);
      setDraft('');
    } else {
      onChange(e.target.value);
    }
  }

  function commit() {
    const v = draft.trim();
    if (v) onChange(v);
    setEditing(false);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={isCustom ? CUSTOM_SENTINEL : value}
        onChange={handleSelectChange}
        className={ECO_SELECT_CLS}
      >
        {options.map(o => (
          <option key={o} value={o} className="bg-card">{labels[o] ?? o}</option>
        ))}
        {isCustom && (
          <option value={CUSTOM_SENTINEL} className="bg-card">{value}</option>
        )}
        <option value={CUSTOM_SENTINEL} disabled={false} className="bg-card text-muted-foreground">
          {isCustom ? '✎ Edit custom…' : '+ Custom…'}
        </option>
      </select>
      {editing && (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setEditing(false); setDraft(''); }
          }}
          placeholder="Type custom option and press Enter…"
          className={inputCls}
        />
      )}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-muted/40 border border-border rounded-md text-foreground text-[13px] px-3 py-2 outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 font-[inherit]';

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Basics', 'Items', 'Details', 'Impact', 'Approval'];

function Stepper({ step, maxStepReached, onStepClick }: { step: number; maxStepReached: number; onStepClick: (i: number) => void }) {
  return (
    <div className="flex gap-1">
      {STEPS.map((s, i) => {
        const locked = i > maxStepReached;
        return (
          <div
            key={s}
            onClick={() => !locked && onStepClick(i)}
            className={cn('flex-1 pb-2.5', locked ? 'cursor-not-allowed' : 'cursor-pointer')}
          >
            <div className="flex items-center gap-1.5 mb-1.5" style={{ opacity: locked ? 0.45 : 1 }}>
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
                style={{ fontWeight: i === step ? 600 : 500 }}
              >
                {s}
              </span>
            </div>
            <div
              className="h-0.5 rounded"
              style={{ background: i <= step ? '#2563EB' : 'hsl(var(--border))' }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Wizard state types ────────────────────────────────────────────────────────

type ECOScope = 'BOM_PART' | 'REQUIREMENT';

interface BasicsState {
  title: string; description: string;
  type: ECOType | string; priority: ECOPriority; reason: ECOReason | string;
  changeClass: ChangeClass;
  ecr: string;
  effType: EffectivityType; effValue: string;
  scope: ECOScope;
}

interface ReqItemState {
  key: string;
  title: string;
  status: string;
  category: string;
}

interface ItemState {
  pn: string; desc: string; impact: ImpactLevel;
  disp: ECODisposition; whereUsed: string[];
  partId: string; nodeId: string;
  revFrom: string; revTo: string;
}

interface DiffRowState {
  param: string; from: string; to: string; cls: ChangeLabel;
  paramIsCustom?: boolean;
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
  projectId,
  ecoId,
  onClose,
}: {
  projectId: string;
  ecoId?: string;
  onClose: (result?: { saved: boolean }) => void;
}) {
  const isEdit = !!ecoId;
  const createMutation = useCreateECO(projectId);
  const updateMutation = useUpdateECO(projectId, ecoId ?? '');
  const { data: editDetail, isLoading: editLoading } = useECODetail(isEdit ? projectId : undefined, ecoId);

  const [seeded, setSeeded] = useState(false);
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 — Basics
  const [basics, setBasics] = useState<BasicsState>({
    title: '', description: '',
    type: 'DESIGN_CHANGE', priority: 'MEDIUM',
    reason: 'PERFORMANCE', changeClass: 'II',
    ecr: '',
    effType: 'DATE', effValue: '',
    scope: 'BOM_PART',
  });

  // Step 2 — Affected items (real BOM parts for this project)
  const { data: bomTree } = useBomTree(projectId);
  const bomRootNodes = useMemo(() => (bomTree?.roots ?? []).map(r => fromApiNode(r)), [bomTree]);
  const bomPool = useMemo(
    () => bomFlatAll(bomRootNodes).map(n => ({
      pn: n.pn,
      desc: n.desc,
      rev: n.rev,
      partId: n._partId ?? '',
      nodeId: n.id,
      whereUsed: (bomPath(n.id, bomRootNodes) ?? []).slice(0, -1).map(a => `${a.pn} ${a.desc}`),
    })),
    [bomRootNodes],
  );

  const [items, setItems] = useState<ItemState[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reqItems, setReqItems] = useState<ReqItemState[]>([]);
  const [reqPickerOpen, setReqPickerOpen] = useState(false);

  // Selecting a part auto-populates Rev From from its current BOM revision;
  // Rev To is left for the user to fill in once the target rev is known.
  const addItem = (p: typeof bomPool[number]) => {
    setItems(prev =>
      prev.find(x => x.pn === p.pn)
        ? prev
        : [...prev, {
          pn: p.pn, desc: p.desc, impact: 'MEDIUM', disp: 'REWORK', whereUsed: p.whereUsed,
          partId: p.partId, nodeId: p.nodeId,
          revFrom: p.rev, revTo: '',
        }],
    );
    setPickerOpen(false);
  };

  // Step 3 — Diff rows + attachments
  const [diffRows, setDiffRows] = useState<DiffRowState[]>([{ param: '', from: '', to: '', cls: 'MODIFIED' }]);
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pre-populate all steps from the fetched ECO detail (edit mode only)
  useEffect(() => {
    if (!editDetail || seeded) return;
    const d = editDetail;
    setBasics({
      title:       d.title,
      description: d.description ?? '',
      type:        (d.type?.toUpperCase() ?? 'DESIGN_CHANGE') as ECOType,
      priority:    (d.priority?.toUpperCase() ?? 'MEDIUM') as ECOPriority,
      reason:      (d.reason?.toUpperCase() ?? 'PERFORMANCE') as ECOReason,
      changeClass: (d.changeClass ?? 'II') as ChangeClass,
      ecr:         d.originatingEcr ?? '',
      effType:     (d.effectivityType?.toUpperCase() ?? 'DATE') as EffectivityType,
      effValue:    d.effectivityValue ?? '',
      scope:       'BOM_PART',
    });
    setItems(
      d.parts.map(p => ({
        pn:        p.partNumber,
        desc:      p.description,
        impact:    (p.impactLevel?.toUpperCase() ?? 'MEDIUM') as ImpactLevel,
        disp:      (p.disposition?.toUpperCase() ?? 'REWORK') as ECODisposition,
        revFrom:   p.revFrom ?? '',
        revTo:     p.revTo ?? '',
        partId:    p.partId,
        nodeId:    p.bomNodeId ?? '',
        whereUsed: (p.whereUsedPaths ?? []).map(path => path.join(' › ')),
      })),
    );
    setDiffRows(
      d.diffRows.length > 0
        ? d.diffRows
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(r => {
              const isKnown = ALL_KNOWN_PARAM_LABELS.has(r.parameter ?? '');
              return {
                param: r.parameter,
                from:  r.fromValue ?? '',
                to:    r.toValue   ?? '',
                cls:   (r.changeLabel?.toUpperCase() ?? 'MODIFIED') as ChangeLabel,
                paramIsCustom: !!r.parameter && !isKnown,
              };
            })
        : [{ param: '', from: '', to: '', cls: 'MODIFIED' }],
    );
    setImpact({
      schedule:      (d.scheduleImpact?.toUpperCase() ?? 'MEDIUM') as ImpactLevel,
      recert:        d.requiresRecertification ?? false,
      firmware:      d.firmwareCoupling ?? false,
      unitCostDelta: d.unitCostDelta != null ? String(d.unitCostDelta) : '',
      oneTimeCost:   d.oneTimeCost   != null ? String(d.oneTimeCost)  : '',
    });
    if (d.steps?.length) {
      setPipeline(
        d.steps
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(s => ({
            stage:          s.stage,
            stageLabel:     s.stageLabel ?? s.stage,
            approverId:     s.approverUserId ?? null,
            name:           s.approverName   ?? '',
            role:           s.approverRole   ?? '',
            optional:       s.isOptional,
            optionalReason: s.optionalReason ?? '',
            justification:  s.justification  ?? '',
          })),
      );
    }
    setMaxStepReached(4);
    setSeeded(true);
  }, [editDetail, seeded]);

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

  // Step 5 — Pipeline (approvers are real project members, picked by the user)
  const { user: currentUser } = useAuth();
  const { data: projectMembers = [] } = useProjectMembers(projectId);

  const defaultOrder = useMemo(() => {
    const m: Record<string, number> = {};
    PIPELINE_STAGE_DEFS.forEach((s, i) => { m[s.stage] = i; });
    return m;
  }, []);

  const [pipeline, setPipeline] = useState<PipelineStepWizard[]>(
    PIPELINE_STAGE_DEFS.map(s => ({ ...s, justification: s.optionalReason ?? '' })),
  );

  // Auto-fill Originator slot with the current user once members load
  useEffect(() => {
    if (!currentUser || projectMembers.length === 0) return;
    const me = projectMembers.find(m => m.id === currentUser.id);
    if (!me) return;
    setPipeline(pl => pl.map((x, i) =>
      i === 0 && !x.approverId
        ? { ...x, approverId: me.id, name: me.name, role: me.role ?? '' }
        : x,
    ));
  }, [currentUser, projectMembers]);

  const assignApprover = (idx: number, memberId: string) => {
    const member = projectMembers.find(m => m.id === memberId);
    setPipeline(pl => pl.map((x, i) => (
      i === idx ? { ...x, approverId: member?.id ?? null, name: member?.name ?? '', role: member?.role ?? '' } : x
    )));
  };

  // Lock QA & Final Approval for Class I
  const lockStage = (stage: string) =>
    basics.changeClass === 'I' && (stage === 'Quality Assurance' || stage === 'Final Approval');

  const stageMoved = (p: PipelineStep, idx: number) =>
    defaultOrder[p.stage] !== undefined && defaultOrder[p.stage] !== idx;

  const pipelineValid = true;

  const activeMutation = isEdit ? updateMutation : createMutation;
  const canSubmit = !activeMutation.isPending;

  // Auto-fill "From" in Details when scope is BOM_PART
  const firstSelectedNode = useMemo(() => {
    if (items.length === 0) return null;
    return bomFlatAll(bomRootNodes).find(n => n.id === items[0].nodeId) ?? null;
  }, [items, bomRootNodes]);

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0 && !basics.title.trim()) e.title = 'Title is required';
    if (s === 1) {
      if (basics.scope === 'BOM_PART' && items.length < 1) e.items = 'At least 1 affected part is required';
      if (basics.scope === 'REQUIREMENT' && reqItems.length < 1) e.items = 'At least 1 affected requirement is required';
    }
    if (s === 2 && !diffRows.some(r => r.param.trim())) e.details = 'At least 1 parameter is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setErrors({});
    const next = step + 1;
    setStep(next);
    setMaxStepReached(m => Math.max(m, next));
  };

  const handleStepClick = (i: number) => {
    setErrors({});
    setStep(i);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const upItem = <K extends keyof ItemState>(idx: number, key: K, val: ItemState[K]) =>
    setItems(prev => prev.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));

  const upRow = <K extends keyof DiffRowState>(idx: number, key: K, val: DiffRowState[K]) =>
    setDiffRows(prev => prev.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));

  // ── Step content ──────────────────────────────────────────────────────────

  const StepBasics = (
    <div className="flex flex-col gap-3.5">
      <div>
        <FieldLabel required>Title</FieldLabel>
        <input
          value={basics.title}
          onChange={e => {
            setBasics({ ...basics, title: e.target.value });
            if (errors.title) setErrors(({ title: _title, ...rest }) => rest);
          }}
          placeholder="e.g. Motor Housing Redesign"
          className={cn(inputCls, errors.title && 'border-destructive')}
        />
        {errors.title && (
          <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" />{errors.title}
          </p>
        )}
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
      {/* <div>
        <FieldLabel required>Scope</FieldLabel>
        <div className="flex bg-muted/40 border border-border rounded-md p-0.5 w-fit">
          {(['BOM_PART', 'REQUIREMENT'] as ECOScope[]).map(s => (
            <button
              key={s}
              onClick={() => {
                setBasics({ ...basics, scope: s });
                setItems([]);
                setReqItems([]);
                setDiffRows([{ param: '', from: '', to: '', cls: 'MODIFIED' }]);
              }}
              className="px-3 py-1.5 rounded text-[12px] font-semibold transition-colors font-[inherit]"
              style={{
                background: basics.scope === s ? '#2563EB' : 'transparent',
                color: basics.scope === s ? '#fff' : undefined,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {s === 'BOM_PART' ? 'BOM Part' : 'Requirement'}
            </button>
          ))}
        </div>
      </div> */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Change Type</FieldLabel>
          <EcoSelectWithCustom value={basics.type} onChange={v => setBasics({ ...basics, type: v })} options={Object.keys(ECO_TYPE_LABEL)} labels={ECO_TYPE_LABEL} />
        </div>
        <div>
          <FieldLabel required>Reason Code</FieldLabel>
          <EcoSelectWithCustom value={basics.reason} onChange={v => setBasics({ ...basics, reason: v })} options={Object.keys(REASON_LABEL)} labels={REASON_LABEL} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Priority</FieldLabel>
          <EcoSelect value={basics.priority} onChange={v => setBasics({ ...basics, priority: v })} options={Object.keys(PRIORITY_LABEL) as ECOPriority[]} labels={PRIORITY_LABEL} />
        </div>
        <div>
          <FieldLabel required>Change Classification</FieldLabel>
          <EcoSelect value={basics.changeClass} onChange={v => setBasics({ ...basics, changeClass: v })} options={Object.keys(CHANGE_CLASS_LABEL) as ChangeClass[]} labels={CHANGE_CLASS_LABEL} />
        </div>
      </div>
      {basics.changeClass === 'I' && (
        <div className="flex items-center gap-1.5 text-[11px] -mt-1" style={{ color: '#DC2626' }}>
          <Lock className="w-3 h-3" />
          Class I locks QA &amp; Final Approval as mandatory in the pipeline.
        </div>
      )}
      <div>
        <FieldLabel>Originating ECR</FieldLabel>
        <input value={basics.ecr} onChange={e => setBasics({ ...basics, ecr: e.target.value })} placeholder="ECR-2026-088 (optional)" className={inputCls} />
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
            type={basics.effType === 'DATE' ? 'date' : 'text'}
            value={basics.effValue}
            onChange={e => setBasics({ ...basics, effValue: e.target.value })}
            placeholder={
              basics.effType === 'SERIAL' ? 'Effective from S/N EVC-1450'
                : basics.effType === 'LOT' ? 'Effective from Lot 2026-W18'
                  : undefined
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

  const StepItemsBomPart = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          {items.length === 0 ? 'No part selected yet' : '1 affected part · where-used auto-rolls up from BOM'}
        </div>
        {items.length === 0 && (
          <button
            onClick={() => setPickerOpen(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-[inherit]"
          >
            <Plus className="w-3 h-3" />
            Add part
          </button>
        )}
      </div>
      {pickerOpen && (
        <div className="border border-border rounded-lg overflow-hidden">
          {bomPool.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
              No parts in this project's BOM yet.
            </div>
          ) : (
            bomPool.map(p => (
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
            ))
          )}
        </div>
      )}
      {items.length === 0 && !pickerOpen && (
        <div
          className="py-7 text-center border border-dashed rounded-lg text-[12px]"
          style={{
            borderColor: errors.items ? '#DC2626' : 'hsl(var(--border))',
            color: errors.items ? '#DC2626' : 'hsl(var(--muted-foreground))',
          }}
        >
          {errors.items ?? 'No parts yet — at least one is required to submit.'}
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
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <FieldLabel>Rev From</FieldLabel>
              <input value={it.revFrom} disabled className={cn(inputCls, 'font-mono text-center cursor-not-allowed opacity-70')} />
            </div>
            <div className="flex-1">
              <FieldLabel>Rev To</FieldLabel>
              <input
                value={it.revTo}
                onChange={e => upItem(idx, 'revTo', e.target.value)}
                placeholder="e.g. B"
                maxLength={3}
                className={cn(inputCls, 'font-mono text-center')}
              />
            </div>
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

  const StepItemsRequirement = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          {reqItems.length} affected requirement{reqItems.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setReqPickerOpen(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-[inherit]"
        >
          <Plus className="w-3 h-3" />
          Add requirement
        </button>
      </div>
      {reqPickerOpen && (
        <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
          {REQS.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
              No requirements in this project yet.
            </div>
          ) : (
            REQS.filter(r => !reqItems.find(ri => ri.key === r.key)).map(r => (
              <div
                key={r.key}
                onClick={() => {
                  setReqItems(prev => [...prev, { key: r.key, title: r.title, status: r.status, category: r.category }]);
                  setReqPickerOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono font-semibold text-blue-500 shrink-0">{r.key}</span>
                  <span className="text-[12px] text-muted-foreground truncate">{r.title}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-border shrink-0 ml-2">{r.status}</span>
              </div>
            ))
          )}
        </div>
      )}
      {reqItems.length === 0 && !reqPickerOpen && (
        <div
          className="py-7 text-center border border-dashed rounded-lg text-[12px]"
          style={{
            borderColor: errors.items ? '#DC2626' : 'hsl(var(--border))',
            color: errors.items ? '#DC2626' : 'hsl(var(--muted-foreground))',
          }}
        >
          {errors.items ?? 'No requirements yet — at least one is required to submit.'}
        </div>
      )}
      {reqItems.map((ri, idx) => (
        <div key={ri.key} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono font-semibold text-blue-500 shrink-0">{ri.key}</span>
            <span className="text-[12px] text-foreground truncate">{ri.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-border">{ri.status}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-border">{ri.category}</span>
            <button onClick={() => setReqItems(reqItems.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const StepItems = basics.scope === 'REQUIREMENT' ? StepItemsRequirement : StepItemsBomPart;

  const StepDetails = (
    <div className="flex flex-col gap-3">
      {/* Diff rows */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          Field-level diff · {diffRows.length} row{diffRows.length !== 1 ? 's' : ''}
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
          <div className="flex-1">From</div>
          <div className="flex-1">To</div>
          <div className="w-32">Class</div>
          <div className="w-5" />
        </div>
      )}
      {diffRows.map((r, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          {basics.scope === 'BOM_PART' && items.length > 0 ? (
            r.paramIsCustom ? (
              <input
                autoFocus
                value={r.param}
                onChange={e => setDiffRows(prev => prev.map((x, i) => i === idx ? { ...x, param: e.target.value } : x))}
                onKeyDown={e => {
                  if (e.key === 'Escape') setDiffRows(prev => prev.map((x, i) => i === idx ? { ...x, param: '', paramIsCustom: false } : x));
                }}
                placeholder="Type parameter name…"
                className={cn(inputCls, 'flex-[1.2]')}
              />
            ) : (
              <select
                value={
                  BOM_PARAM_OPTIONS.find(o => o.label === r.param)?.key
                  ?? (ECO_RECOMMENDED_PARAMS.includes(r.param) ? r.param : '')
                }
                onChange={e => {
                  const val = e.target.value;
                  if (val === '__other__') {
                    setDiffRows(prev => prev.map((x, i) => i === idx ? { ...x, param: '', paramIsCustom: true } : x));
                    return;
                  }
                  const bomOpt = BOM_PARAM_OPTIONS.find(o => o.key === val);
                  if (bomOpt) {
                    const autoFrom = firstSelectedNode
                      ? String((firstSelectedNode as Record<string, unknown>)[bomOpt.key] ?? '')
                      : '';
                    setDiffRows(prev => prev.map((x, i) => i === idx ? { ...x, param: bomOpt.label, from: autoFrom, paramIsCustom: false } : x));
                  } else {
                    setDiffRows(prev => prev.map((x, i) => i === idx ? { ...x, param: val, from: '', paramIsCustom: false } : x));
                  }
                }}
                className={cn(ECO_SELECT_CLS, 'flex-[1.2]')}
              >
                <option value="" className="bg-card">— select parameter —</option>
                <optgroup label="BOM Fields">
                  {BOM_PARAM_OPTIONS.map(o => (
                    <option key={o.key} value={o.key} className="bg-card">{o.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Recommended">
                  {ECO_RECOMMENDED_PARAMS.map(p => (
                    <option key={p} value={p} className="bg-card">{p}</option>
                  ))}
                </optgroup>
                <optgroup label="Custom">
                  <option value="__other__" className="bg-card">Other…</option>
                </optgroup>
              </select>

            )
          ) : (
            <input value={r.param} onChange={e => upRow(idx, 'param', e.target.value)} placeholder="Parameter" className={cn(inputCls, 'flex-[1.2]')} />
          )}
          <input value={r.from} onChange={e => upRow(idx, 'from', e.target.value)} placeholder="from" className={cn(inputCls, 'flex-1')} />
          <input value={r.to} onChange={e => upRow(idx, 'to', e.target.value)} placeholder="to" className={cn(inputCls, 'flex-1')} />
          <div className="w-32">
            <EcoSelect value={r.cls} onChange={v => upRow(idx, 'cls', v)} options={Object.keys(CHANGE_LABEL_MAP) as ChangeLabel[]} labels={CHANGE_LABEL_MAP} />
          </div>
          <button onClick={() => setDiffRows(d => d.filter((_, i) => i !== idx))} className="w-5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {errors.details && (
        <p className="text-[11px] text-destructive flex items-center gap-1 -mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{errors.details}
        </p>
      )}
      {diffRows.length === 0 && (
        <div className="py-6 text-center border border-dashed border-border rounded-lg text-[12px] text-muted-foreground">
          Add the parameters that change between revisions.
        </div>
      )}

      {/* Attachments */}
      <div className="mt-2 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground mb-2.5">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          Attachments
          <span className="text-muted-foreground font-normal">· {attachments.length}</span>
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
          <input value={impact.unitCostDelta} onChange={e => { const v = e.target.value; if (/^[+-]?\d*\.?\d*$/.test(v)) setImpact({ ...impact, unitCostDelta: v }); }} placeholder="+4.55" className={inputCls} />
        </div>
        <div>
          <FieldLabel>One-Time Cost ($)</FieldLabel>
          <input value={impact.oneTimeCost} onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setImpact({ ...impact, oneTimeCost: v }); }} placeholder="12400" className={inputCls} />
        </div>
      </div>
      {([
        ['recert', 'Requires Recertification', 'CE / UL / ISO re-test needed'],
        ['firmware', 'Firmware Coupling', 'SW/FW dependency exists'],
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
        Ordered sign-off pipeline · assign a project member to each stage · reorder with arrows · mark stages optional. Any change to the default requires a justification.
      </div>
      {projectMembers.length === 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
          style={{ color: '#F59E0B', background: '#F59E0B14', border: '1px solid #F59E0B33' }}
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          No project members found — add members to the project team before assigning approvers.
        </div>
      )}
      {basics.changeClass === 'I' && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
          style={{ color: '#DC2626', background: '#DC262614', border: '1px solid #DC262633' }}
        >
          <Lock className="w-3 h-3 shrink-0" />
          Class I — Safety/Regulatory: QA and Final Approval are locked as mandatory and cannot be removed.
        </div>
      )}
      {pipeline.length < 2 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
          style={{ color: '#DC2626', background: '#DC262614', border: '1px solid #DC262633' }}
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          At least one approver besides the Originator is required — this ECO can&apos;t be submitted with nobody to review it.
        </div>
      )}
      {pipeline.map((p, idx) => {
        const locked = lockStage(p.stage);
        const removalLocked = locked || pipeline.length <= 2;
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
              <ECOAvatar name={p.name || '?'} size={26} />
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
                <select
                  value={p.approverId ?? ''}
                  onChange={e => assignApprover(idx, e.target.value)}
                  className="mt-0.5 w-full max-w-[240px] bg-muted/40 border rounded-md text-foreground text-[11px] px-2 py-1 outline-none focus:border-primary/40 cursor-pointer appearance-none font-[inherit]"
                  style={{ borderColor: p.approverId ? 'hsl(var(--border))' : '#F59E0B88' }}
                >
                  <option value="" disabled className="bg-card">Select approver…</option>
                  {projectMembers.map(m => (
                    <option key={m.id} value={m.id} className="bg-card">{m.name} · {m.role}</option>
                  ))}
                </select>
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
                  onClick={() => setPipeline(pl => { const n = [...pl];[n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; })}
                  className="disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                </button>
                <button
                  disabled={idx === pipeline.length - 1}
                  onClick={() => setPipeline(pl => { const n = [...pl];[n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; return n; })}
                  className="disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              {removalLocked ? (
                <div className="w-4 flex justify-center" title={locked ? undefined : 'At least one non-Originator approver is required'}>
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

  if (isEdit && editLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
        <div className="w-[680px] max-w-full flex items-center justify-center bg-card border border-border rounded-xl shadow-2xl h-48">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <svg className="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Loading ECO…</span>
          </div>
        </div>
      </div>
    );
  }

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
                  {isEdit ? 'Edit Engineering Change Order' : 'New Engineering Change Order'}
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
          <Stepper step={step} maxStepReached={maxStepReached} onStepClick={handleStepClick} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {stepContent}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
          <div className="text-[11px] flex items-center gap-1.5">
            <span className="text-muted-foreground">Ready to save draft</span>
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => { setErrors({}); setStep(step - 1); }}
                className="px-4 py-2 rounded-md text-[13px] font-medium bg-muted/50 text-foreground border border-border hover:bg-accent/50 transition-colors font-[inherit]"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-md text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-[inherit]"
              >
                Next
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (!canSubmit) return;
                  const payload = {
                    title: basics.title,
                    description: basics.description || null,
                    type: basics.type.toLowerCase() as any,
                    reason: basics.reason.toLowerCase() as any,
                    priority: basics.priority.toLowerCase() as any,
                    changeClass: basics.changeClass as any,
                    effectivityType: basics.effType.toLowerCase() as any,
                    effectivityValue: basics.effValue || null,
                    originatingEcr: basics.ecr || null,
                    revFrom: items[0]?.revFrom || null,
                    revTo: items[0]?.revTo || null,
                    scheduleImpact: impact.schedule.toLowerCase() as any,
                    requiresRecertification: impact.recert,
                    firmwareCoupling: impact.firmware,
                    unitCostDelta: impact.unitCostDelta ? parseFloat(impact.unitCostDelta) : null,
                    oneTimeCost: impact.oneTimeCost ? parseFloat(impact.oneTimeCost) : null,
                    parts: items.map(it => ({
                      partId: it.partId,
                      bomNodeId: it.nodeId || null,
                      revFrom: it.revFrom || null,
                      revTo: it.revTo || null,
                      impactLevel: it.impact.toLowerCase() as any,
                      disposition: it.disp.toLowerCase() as any,
                    })),
                    diffRows: diffRows
                      .filter(r => r.param.trim() !== '')
                      .map((r, i) => ({
                        order: i,
                        parameter: r.param,
                        fromValue: r.from || null,
                        toValue: r.to || null,
                        changeLabel: r.cls.toLowerCase() as any,
                      })),
                    pipelineSteps: pipeline.map((p, i) => ({
                      order: i + 1,
                      stage: p.stage,
                      stageLabel: p.stage,
                      approverUserId: p.approverId || null,
                      approverName: p.name || null,
                      approverRole: p.role || null,
                      isOptional: p.optional ?? false,
                      optionalReason: p.optionalReason || null,
                      justification: p.justification || null,
                    })),
                  };
                  try {
                    await activeMutation.mutateAsync(payload);
                    toast.success(isEdit ? 'ECO updated' : 'ECO created');
                    onClose({ saved: true });
                  } catch (err) {
                    toast.error(isEdit ? 'Failed to update ECO' : 'Failed to create ECO', {
                      description: err instanceof Error ? err.message : undefined,
                    });
                  }
                }}
                disabled={!canSubmit || activeMutation.isPending}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors font-[inherit]',
                  canSubmit && !activeMutation.isPending
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground cursor-default',
                )}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                {activeMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Draft'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
