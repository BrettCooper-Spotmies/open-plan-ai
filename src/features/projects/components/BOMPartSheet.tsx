/**
 * BOMPartSheet — centred full-size dialog for Add / Edit a BOM part.
 * Tabs: Details · Sourcing · Traceability · Documents
 * Edit mode shows version management inline.
 */
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Zap, Cpu, Package, Box, Monitor, Shield, Layers, ChevronsUpDown,
  CheckCircle, Clock, GitBranch, Save, Plus, X, ChevronRight, ChevronLeft,
  FileText, ImageIcon, Upload, Paperclip, AlertCircle, Link as LinkIcon,
  Check, XCircle, History, Loader2,
} from 'lucide-react';
import {
  BOMNode, BOMStatus, BOMCategory, BOM_CAT_META,
} from './bomData';
import { BOMStatusPill } from './BOMShared';
import { BOMRejectDialog } from './BOMRejectDialog';
import { useProjectMembers } from '@/hooks/useProjectTeam';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { useApproveBomNode, useRejectBomNode, useBomNodeApprovals } from '@/hooks/useBom';
import { TeamMember } from '@/types';

// ── Document value: either an uploaded file or a linked URL ───────
export type DocValue = { kind: 'file'; file: File } | { kind: 'url'; url: string; fileName?: string };

// ── Public payload type ───────────────────────────────────────────
export interface BOMPartPayload {
  mode: 'add' | 'edit';
  pn: string;
  desc: string;
  category: BOMCategory;
  status: BOMStatus;
  rev: string;
  qty: number;
  uom: string;
  manufacturer: string;
  distributor: string;
  price: number;
  leadTime: number;
  mpn: string;
  owner: string;
  ownerId?: string;
  req: string[];
  // documents (uploaded file or linked URL; null = cleared, undefined = unchanged)
  docPhoto?: DocValue | null;
  // technical files support multiple attachments per category
  docDatasheet?: DocValue[];
  doc3DModel?: DocValue[];
  docFootprint?: DocValue[];
  // edit-only version fields
  versionMode?: 'same' | 'new';
  newRevLabel?: string;
  changeNotes?: string;
}

interface Props {
  mode: 'add' | 'edit';
  node?: BOMNode;           // required when mode === 'edit'
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSave: (payload: BOMPartPayload) => void | Promise<void>;
}

// ── Constants ─────────────────────────────────────────────────────
const TABS = ['details', 'sourcing', 'traceability', 'documents'] as const;
type WizardTabId = typeof TABS[number];
type TabId = WizardTabId | 'history';
// 'history' isn't part of the linear wizard flow — treat it as index -1 so Next/Back math stays well-defined.
const wizardIndex = (t: TabId) => (t === 'history' ? -1 : TABS.indexOf(t));

const LETTERS = 'ABCDEFGHIJ';
const CATEGORIES: BOMCategory[] = ['assembly', 'power', 'control', 'connector', 'enclosure', 'hmi', 'safety'];
const CAT_ICONS: Record<BOMCategory, React.ElementType> = {
  assembly: Layers, power: Zap, control: Cpu, connector: Package,
  enclosure: Box, hmi: Monitor, safety: Shield,
};
const UOM_OPTIONS = ['EA', 'SET', 'LIC', 'KG', 'M', 'FT', 'PCS', 'LOT'];

type LeadTimeUnit = 'days' | 'weeks' | 'months';
// BOMPartPayload.leadTime is always expressed in weeks downstream — these factors convert into weeks.
const LEAD_TIME_UNITS: { id: LeadTimeUnit; label: string; toWeeks: number }[] = [
  { id: 'days',   label: 'Days',   toWeeks: 1 / 7 },
  { id: 'weeks',  label: 'Weeks',  toWeeks: 1 },
  { id: 'months', label: 'Months', toWeeks: 30 / 7 },
];

function nextRev(rev: string) {
  const i = LETTERS.indexOf(rev.toUpperCase());
  return i >= 0 && i < LETTERS.length - 1 ? LETTERS[i + 1] : rev;
}

// ── Small form primitives ─────────────────────────────────────────
const FL = ({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string;
}) => (
  <div className={cn('space-y-1.5', className)}>
    <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    {children}
  </div>
);

const FInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <Input {...props} className={cn('h-8 text-sm bg-muted border-border focus-visible:ring-1', props.className)} />
);

// ── File upload row (supports multiple uploaded files and/or linked URLs) ──
interface FileRowProps {
  icon: React.ElementType;
  label: string;
  hint: string;
  accept: string;
  value: DocValue[];
  onChange: (v: DocValue[]) => void;
}
function FileRow({ icon: Icon, label, hint, accept, value, onChange }: FileRowProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onChange([...value, ...Array.from(files).map(file => ({ kind: 'file', file }) as DocValue)]);
  };
  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    onChange([...value, { kind: 'url', url: u }]);
    setUrlInput('');
    setShowUrlInput(false);
  };
  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 p-3">
        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          {value.length === 0 && <div className="text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => ref.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-background hover:bg-muted transition-colors">
            <Upload className="w-3 h-3" /> Upload
          </button>
          <button onClick={() => setShowUrlInput(s => !s)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-background hover:bg-muted transition-colors">
            <LinkIcon className="w-3 h-3" /> URL
          </button>
        </div>
        <input ref={ref} type="file" accept={accept} multiple className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>
      {value.length > 0 && (
        <div className="px-3 pb-3 -mt-1 space-y-1.5">
          {value.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50">
              {v.kind === 'file' ? (
                <>
                  <span className="text-[11px] text-primary font-medium truncate flex-1">{v.file.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({(v.file.size / 1024).toFixed(0)} KB)
                  </span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[11px] text-primary font-medium truncate flex-1">{v.url}</span>
                </>
              )}
              <button onClick={() => removeAt(i)}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {showUrlInput && (
        <div className="px-3 pb-3 -mt-1 flex items-center gap-2">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addUrl(); }}
            placeholder="https://example.com/file.pdf"
            className="flex-1 h-8 text-xs bg-muted border border-border rounded-md px-2.5 outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
          />
          <button
            disabled={!urlInput.trim()}
            onClick={addUrl}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

// ── Photo upload (supports uploading a file or linking a URL) ──────
function PhotoUpload({ value, onChange }: { value: DocValue | null; onChange: (v: DocValue | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const preview = value?.kind === 'file' ? URL.createObjectURL(value.file) : value?.kind === 'url' ? value.url : null;

  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    onChange({ kind: 'url', url: u });
    setUrlInput('');
  };

  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Product Photo
      </Label>
      <div
        onClick={() => { if (!value && mode === 'file') ref.current?.click(); }}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors',
          value ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30',
          !value && mode === 'file' && 'cursor-pointer',
        )}
        style={{ height: 140 }}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl opacity-80" />
            {value?.kind === 'file' && (
              <div onClick={() => ref.current?.click()}
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 rounded-xl cursor-pointer">
                <span className="text-xs text-white font-medium">Click to replace</span>
              </div>
            )}
          </>
        ) : mode === 'file' ? (
          <>
            <ImageIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <span className="text-xs text-muted-foreground">Click to upload product photo</span>
            <span className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG, WEBP · max 10 MB</span>
          </>
        ) : (
          <div className="w-full px-4 flex flex-col items-center gap-2">
            <LinkIcon className="w-6 h-6 text-muted-foreground/40" />
            <div className="w-full flex items-center gap-2">
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addUrl(); }}
                onClick={e => e.stopPropagation()}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 h-8 text-xs bg-background border border-border rounded-md px-2.5 outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
              />
              <button
                disabled={!urlInput.trim()}
                onClick={e => { e.stopPropagation(); addUrl(); }}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {value ? (
          <>
            <button onClick={() => onChange(null)} className="text-[11px] text-destructive hover:underline">
              Remove photo
            </button>
            {value.kind === 'url' && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">{value.url}</span>
            )}
          </>
        ) : (
          <button onClick={() => setMode(m => m === 'file' ? 'url' : 'file')} className="text-[11px] text-muted-foreground hover:text-foreground underline">
            {mode === 'file' ? 'or paste an image URL' : 'or upload a file instead'}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { onChange({ kind: 'file', file: f }); setMode('file'); } }} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export function BOMPartSheet({ mode, node, projectId, open, onClose, onSave }: Props) {
  const isEdit = mode === 'edit';

  const { data: projectMembers = [] } = useProjectMembers(projectId);
  const { data: project } = useProjectDetail(projectId);
  const projectRole = (project?.myRole || '').toLowerCase();
  const canEditStatus = projectRole === 'admin' || projectRole === 'manager';

  const approveBomNode = useApproveBomNode(projectId);
  const rejectBomNode = useRejectBomNode(projectId);
  const { data: approvals = [], isLoading: approvalsLoading } = useBomNodeApprovals(isEdit ? node?.id : undefined);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // ── Form state ──
  const [pn,             setPn]             = useState(node?.pn ?? '');
  const [desc,           setDesc]           = useState(node?.desc ?? '');
  const [category,       setCategory]       = useState<BOMCategory>(node?.cat ?? 'assembly');
  const [status,         setStatus]         = useState<BOMStatus>(node?.status ?? 'pending');
  const [rev,            setRev]            = useState(node?.rev ?? 'A');
  const [qty,            setQty]            = useState(String(node?.qty ?? 1));
  const [uom,            setUom]            = useState(node?.uom ?? 'EA');
  const [manufacturer,   setManufacturer]   = useState(node?.manufacturer ?? '');
  const [distributor,    setDistributor]    = useState(node?.distributor ?? '');
  const [price,          setPrice]          = useState(String(node?.price ?? ''));
  const [leadTime,       setLeadTime]       = useState(String(node?.leadTime ?? ''));
  const [leadTimeUnit,   setLeadTimeUnit]   = useState<LeadTimeUnit>('weeks');
  const [mpn,            setMpn]            = useState(node?.mpn ?? '');
  const [selectedOwner,  setSelectedOwner]  = useState<TeamMember | null>(null);
  const [ownerPopover,   setOwnerPopover]   = useState(false);
  const [req,            setReq]            = useState<string[]>(node?.req ?? []);
  const [activeTab,      setActiveTab]      = useState<TabId>('details');
  const [reqInput,     setReqInput]     = useState('');
  // documents
  const [docPhoto,     setDocPhoto]     = useState<DocValue | null>(null);
  const [docDatasheet, setDocDatasheet] = useState<DocValue[]>([]);
  const [doc3DModel,   setDoc3DModel]   = useState<DocValue[]>([]);
  const [docFootprint, setDocFootprint] = useState<DocValue[]>([]);
  // edit: version
  const [versionMode,  setVersionMode]  = useState<'same' | 'new'>('same');
  const [newRevLabel,  setNewRevLabel]  = useState(node ? nextRev(node.rev) : 'B');
  const [changeNotes,  setChangeNotes]  = useState('');
  // validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset all form state when the dialog opens so stale data never shows
  useEffect(() => {
    if (!open) return;
    setPn(node?.pn ?? '');
    setDesc(node?.desc ?? '');
    setCategory(node?.cat ?? 'assembly');
    setStatus(node?.status ?? 'pending');
    setRev(node?.rev ?? 'A');
    setQty(String(node?.qty ?? 1));
    setUom(node?.uom ?? 'EA');
    setManufacturer(node?.manufacturer ?? '');
    setDistributor(node?.distributor ?? '');
    setPrice(String(node?.price ?? ''));
    setLeadTime(String(node?.leadTime ?? ''));
    setLeadTimeUnit('weeks');
    setMpn(node?.mpn ?? '');
    setSelectedOwner(null);
    setOwnerPopover(false);
    setReq(node?.req ?? []);
    setReqInput('');
    setDocPhoto(null);
    setDocDatasheet([]);
    setDoc3DModel([]);
    setDocFootprint([]);
    setVersionMode('same');
    setNewRevLabel(node ? nextRev(node.rev) : 'B');
    setChangeNotes('');
    setErrors({});
    setActiveTab('details');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const addReq = () => {
    const v = reqInput.trim().toUpperCase();
    if (v && !req.includes(v)) { setReq(r => [...r, v]); }
    setReqInput('');
  };
  const removeReq = (r: string) => setReq(rs => rs.filter(x => x !== r));

  const validateTab = (tab: WizardTabId): boolean => {
    const e: Record<string, string> = {};
    if (tab === 'details') {
      if (!isEdit && !pn.trim()) e.pn = 'Part number is required';
      if (!desc.trim())          e.desc = 'Description is required';
      if (!selectedOwner)        e.owner = 'Owner is required';
    }
    if (tab === 'sourcing') {
      if (!manufacturer.trim())  e.mfr = 'Manufacturer is required';
    }
    if (tab === 'documents') {
      if (isEdit && versionMode === 'new' && !changeNotes.trim())
        e.notes = 'Change notes are required when creating a new revision';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (activeTab === 'history') return;
    if (!validateTab(activeTab)) return;
    setActiveTab(TABS[wizardIndex(activeTab) + 1]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isEdit && !pn.trim())          e.pn = 'Part number is required';
    if (!desc.trim())                   e.desc = 'Description is required';
    if (!manufacturer.trim())           e.mfr = 'Manufacturer is required';
    if (!selectedOwner)                 e.owner = 'Owner is required';
    if (isEdit && versionMode === 'new' && !changeNotes.trim()) e.notes = 'Change notes are required when creating a new revision';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await onSave({
        mode,
        pn: isEdit ? (node?.pn ?? pn) : pn.trim(),
        desc, category, status,
        rev: isEdit ? (versionMode === 'new' ? (newRevLabel || nextRev(node!.rev)) : node!.rev) : rev,
        qty: parseFloat(qty) || 1,
        uom,
        manufacturer, distributor,
        price: parseFloat(price) || 0,
        leadTime: Math.round((parseFloat(leadTime) || 0) * LEAD_TIME_UNITS.find(u => u.id === leadTimeUnit)!.toWeeks),
        mpn,
        owner: selectedOwner?.name ?? '',
        ownerId: selectedOwner?.id,
        req,
        docPhoto, docDatasheet, doc3DModel, docFootprint,
        versionMode: isEdit ? versionMode : undefined,
        newRevLabel: isEdit && versionMode === 'new' ? newRevLabel : undefined,
        changeNotes: isEdit ? changeNotes : undefined,
      });
      onClose();
    } catch {
      // onSave already surfaces a toast on failure; keep the dialog open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleApproveClick = async () => {
    if (!node) return;
    try {
      await approveBomNode.mutateAsync({ nodeId: node.id });
      toast.success(`${node.pn} approved`);
      onClose();
    } catch (err) {
      toast.error('Failed to approve part', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleRejectConfirm = async (reason: string, comment?: string) => {
    if (!node) return;
    try {
      await rejectBomNode.mutateAsync({ nodeId: node.id, reason, comment });
      toast.success(`${node.pn} rejected`);
      onClose();
    } catch (err) {
      toast.error('Failed to reject part', {
        description: err instanceof Error ? err.message : undefined,
      });
      throw err;
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={v => { if (!v && !saving) onClose(); }}>
      <DialogContent className="max-w-[1200px] w-[92vw] p-0 gap-0 flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh', minHeight: '75vh' }}>

        {/* ── Header ── */}
        <DialogHeader className="px-7 py-5 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2.5">
            {isEdit ? 'Edit Part' : 'Add New Part'}
            {isEdit && node && (
              <span className="text-sm font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {node.pn}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update part details. Choose to overwrite the current revision or create a new one.'
              : 'Fill in all required fields to add a new part to the Bill of Materials.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabId)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TabsList className="mx-7 mt-4 mb-0 shrink-0 bg-muted/50 h-9 w-auto self-start gap-0.5">
            <TabsTrigger value="details"      className="text-xs px-4">Details</TabsTrigger>
            <TabsTrigger value="sourcing"     className="text-xs px-4">Sourcing</TabsTrigger>
            <TabsTrigger value="traceability" className="text-xs px-4">Traceability</TabsTrigger>
            <TabsTrigger value="documents"    className="text-xs px-4">Documents</TabsTrigger>
            {isEdit && node && (
              <TabsTrigger value="history" className="text-xs px-4 gap-1.5">
                <History className="w-3.5 h-3.5" /> History
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── DETAILS — two-column ── */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-7 py-5 mt-0 data-[state=inactive]:hidden">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">

              {/* Left col */}
              <div className="space-y-5">
                <FL label="Part Number" required={!isEdit}>
                  {isEdit ? (
                    <div className="h-9 px-3 flex items-center bg-muted/50 border border-border rounded-md text-sm font-mono text-muted-foreground">
                      {node?.pn}
                    </div>
                  ) : (
                    <>
                      <FInput value={pn} onChange={e => setPn(e.target.value.toUpperCase())}
                        placeholder="e.g. EV-PWR-020" className="h-9 font-mono" />
                      {errors.pn && <p className="text-[11px] text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.pn}</p>}
                    </>
                  )}
                </FL>

                <FL label="Description" required>
                  <Textarea value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Brief technical description of the part"
                    className="text-sm bg-muted border-border resize-none" rows={4} />
                  {errors.desc && <p className="text-[11px] text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.desc}</p>}
                </FL>
              </div>

              {/* Right col */}
              <div className="space-y-5">
                <FL label="Status">
                  {!isEdit ? (
                    <>
                      <div className="flex gap-2">
                        {(['approved', 'pending'] as BOMStatus[]).map(s => (
                          <button key={s} type="button" disabled={!canEditStatus}
                            onClick={() => canEditStatus && setStatus(s)}
                            title={canEditStatus ? undefined : 'Only project managers or admins can change part status'}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors',
                              status === s ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted',
                              canEditStatus ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 hover:bg-card'
                            )}>
                            {s === 'approved'
                              ? <CheckCircle className="w-4 h-4" style={{ color: '#16A34A' }} />
                              : <Clock className="w-4 h-4" style={{ color: '#D97706' }} />}
                            {s === 'approved' ? 'Approved' : 'Pending'}
                          </button>
                        ))}
                      </div>
                      {!canEditStatus && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">Only project managers or admins can change part status.</p>
                      )}
                    </>
                  ) : node?.status === 'pending' && canEditStatus ? (
                    <div className="flex gap-2">
                      <button type="button" disabled={approveBomNode.isPending || rejectBomNode.isPending}
                        onClick={handleApproveClick}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {approveBomNode.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Check className="w-4 h-4" style={{ color: '#16A34A' }} />}
                        Approve
                      </button>
                      <button type="button" disabled={approveBomNode.isPending || rejectBomNode.isPending}
                        onClick={() => setShowRejectDialog(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <XCircle className="w-4 h-4" style={{ color: '#DC2626' }} />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 h-9">
                      <BOMStatusPill status={node?.status ?? 'pending'} />
                      {!canEditStatus && (
                        <span className="text-[11px] text-muted-foreground">Only project managers or admins can approve or reject parts.</span>
                      )}
                    </div>
                  )}
                </FL>

                <FL label="Owner / Handled By" required>
                  <Popover open={ownerPopover} onOpenChange={setOwnerPopover}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'w-full h-9 flex items-center gap-2 px-3 rounded-md border text-sm transition-colors bg-muted border-border hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                          errors.owner && 'border-destructive'
                        )}
                      >
                        {selectedOwner ? (
                          <>
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                                {selectedOwner.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-left truncate">{selectedOwner.name}</span>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-left text-muted-foreground">Select project member…</span>
                          </>
                        )}
                        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[260px]" align="start">
                      <Command>
                        <CommandInput placeholder="Search members…" />
                        <CommandList>
                          <CommandEmpty>No members found.</CommandEmpty>
                          <CommandGroup heading="Project Members">
                            {projectMembers.map(member => (
                              <CommandItem
                                key={member.id}
                                value={`${member.id} ${member.name}`}
                                onSelect={() => {
                                  setSelectedOwner(member);
                                  setOwnerPopover(false);
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[9px]">
                                      {member.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  {member.name}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.owner && <p className="text-[11px] text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.owner}</p>}
                </FL>

                {!isEdit && (
                  <FL label="Initial Revision">
                    <div className="flex items-center gap-3">
                      <FInput value={rev} onChange={e => setRev(e.target.value.toUpperCase().slice(0, 3))}
                        placeholder="A" className="h-9 w-24 font-mono" />
                      <span className="text-xs text-muted-foreground">Starting revision (typically "A")</span>
                    </div>
                  </FL>
                )}
              </div>

              {/* Category — full width */}
              <FL label="Category" className="col-span-2">
                <div className="grid grid-cols-7 gap-2">
                  {CATEGORIES.map(cat => {
                    const m = BOM_CAT_META[cat];
                    const Icon = CAT_ICONS[cat];
                    const active = category === cat;
                    return (
                      <button key={cat} onClick={() => setCategory(cat)}
                        className={cn(
                          'flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-center cursor-pointer transition-all',
                          active ? 'border-primary/60 bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                        )}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: `${m.tint}20` }}>
                          <Icon className="w-4.5 h-4.5" style={{ color: m.tint, width: 18, height: 18 }} />
                        </div>
                        <span className={cn('text-[11px] font-medium leading-tight', active ? 'text-primary' : 'text-muted-foreground')}>
                          {m.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FL>
            </div>
          </TabsContent>

          {/* ── SOURCING — 3-column ── */}
          <TabsContent value="sourcing" className="flex-1 overflow-y-auto px-7 py-5 mt-0 data-[state=inactive]:hidden">
            <div className="grid grid-cols-3 gap-x-6 gap-y-5">
              <FL label="Manufacturer" required className="col-span-3">
                <FInput value={manufacturer} onChange={e => setManufacturer(e.target.value)}
                  placeholder="e.g. Texas Instruments" className="h-9" />
                {errors.mfr && <p className="text-[11px] text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.mfr}</p>}
              </FL>
              <FL label="Manufacturer PN (MPN)">
                <FInput value={mpn} onChange={e => setMpn(e.target.value)}
                  placeholder="e.g. TI-A4B2C" className="h-9 font-mono" />
              </FL>
              <FL label="Supplier / Distributor">
                <FInput value={distributor} onChange={e => setDistributor(e.target.value)}
                  placeholder="e.g. Digi-Key" className="h-9" />
              </FL>
              <FL label="Unit Price">
                <FInput value={price} onChange={e => setPrice(e.target.value)}
                  type="number" step="0.01" placeholder="0.00" className="h-9" />
              </FL>
              <FL label="Lead Time">
                <div className="flex gap-1.5">
                  <FInput value={leadTime} onChange={e => setLeadTime(e.target.value)}
                    type="number" placeholder="8" className="h-9 flex-1" />
                  <div className="flex gap-1 shrink-0">
                    {LEAD_TIME_UNITS.map(u => (
                      <button key={u.id} onClick={() => setLeadTimeUnit(u.id)}
                        className={cn(
                          'px-2.5 h-9 rounded-md text-xs font-medium border cursor-pointer transition-colors',
                          leadTimeUnit === u.id ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:bg-muted'
                        )}>
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </FL>
              <FL label="Quantity">
                <FInput value={qty} onChange={e => setQty(e.target.value)}
                  type="number" placeholder="1" className="h-9" />
              </FL>
              <FL label="Unit of Measure (UOM)">
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {UOM_OPTIONS.map(u => (
                    <button key={u} onClick={() => setUom(u)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium border cursor-pointer transition-colors',
                        uom === u ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:bg-muted'
                      )}>
                      {u}
                    </button>
                  ))}
                </div>
              </FL>
            </div>
          </TabsContent>

          {/* ── TRACEABILITY ── */}
          <TabsContent value="traceability" className="flex-1 overflow-y-auto px-7 py-5 mt-0 data-[state=inactive]:hidden">
            <div className="max-w-xl space-y-4">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requirements Links</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Link this part to system requirements it satisfies (e.g. SYS-001, PWR-003).
                </p>
                <div className="flex gap-2 mb-4">
                  <Input value={reqInput} onChange={e => setReqInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReq(); } }}
                    placeholder="e.g. SYS-001"
                    className="h-9 text-sm bg-muted border-border font-mono flex-1" />
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 px-4 shrink-0" onClick={addReq}
                    disabled={!reqInput.trim()}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
                {req.length === 0 ? (
                  <div className="flex items-center justify-center h-28 rounded-xl border-2 border-dashed border-border bg-muted/20">
                    <p className="text-sm text-muted-foreground">No requirements linked yet — type above to add</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {req.map(r => (
                      <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-muted text-foreground border-border">
                        {r}
                        <button onClick={() => removeReq(r)} className="opacity-60 hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── DOCUMENTS — 2-column ── */}
          <TabsContent value="documents" className="flex-1 overflow-y-auto px-7 py-5 mt-0 data-[state=inactive]:hidden">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <PhotoUpload value={docPhoto} onChange={setDocPhoto} />
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-3">
                  Technical Files
                </Label>
                <FileRow icon={FileText}  label="Datasheet"         hint="PDF · Manufacturer datasheet"
                  accept=".pdf,application/pdf" value={docDatasheet} onChange={setDocDatasheet} />
                <FileRow icon={Paperclip} label="3D Model (STEP)"   hint=".step, .stp · CAD model file"
                  accept=".step,.stp"           value={doc3DModel}   onChange={setDoc3DModel} />
                <FileRow icon={Paperclip} label="Footprint Library" hint=".kicad_mod, .lib · EDA footprint"
                  accept=".kicad_mod,.lib,.lbr" value={docFootprint} onChange={setDocFootprint} />
              </div>
            </div>
          </TabsContent>

          {/* ── HISTORY — approval audit trail (edit mode only) ── */}
          {isEdit && node && (
            <TabsContent value="history" className="flex-1 overflow-y-auto px-7 py-5 mt-0 data-[state=inactive]:hidden">
              <div className="max-w-xl">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  Approval History
                </Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Full record of approve/reject actions taken on this part.
                </p>
                {approvalsLoading ? (
                  <div className="flex flex-col gap-3">
                    {[0, 1].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                  </div>
                ) : approvals.length === 0 ? (
                  <div className="flex items-center justify-center h-28 rounded-xl border-2 border-dashed border-border bg-muted/20">
                    <p className="text-sm text-muted-foreground">No approval activity yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0">
                    {approvals.map((a, i) => {
                      const color = a.action === 'approved' ? '#16A34A' : '#DC2626';
                      return (
                        <div key={a.id} className="flex items-start gap-3 py-2.5 px-2 -mx-2">
                          <div className="flex flex-col items-center shrink-0 mt-1.5">
                            <div className="w-2 h-2 rounded-full border-2 shrink-0" style={{ borderColor: color, background: color }} />
                            {i < approvals.length - 1 && <div className="w-px bg-border flex-1 min-h-[18px] mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-xs font-semibold" style={{ color }}>
                                {a.action === 'approved' ? 'Approved' : 'Rejected'}
                              </span>
                              <span className="text-[11px] text-muted-foreground">by {a.performedByName}</span>
                            </div>
                            {a.reason && (
                              <div className="text-[11.5px] text-foreground leading-snug">Reason: {a.reason}</div>
                            )}
                            {a.comment && (
                              <div className="text-[11.5px] text-muted-foreground leading-snug">{a.comment}</div>
                            )}
                            <div className="text-[10.5px] text-muted-foreground/60 mt-0.5">
                              {new Date(a.date).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* ── Version section (Edit only, last tab only) ── */}
        {isEdit && node && activeTab === 'documents' && (
          <div className="px-7 pt-5 pb-4 border-t border-border bg-muted/20 shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Save as Version
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-background mb-2">
              <button type="button" onClick={() => setVersionMode('same')}
                className={cn('flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  versionMode === 'same' ? 'bg-card border border-border shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                Update Rev {node.rev}
              </button>
              <button type="button" onClick={() => setVersionMode('new')}
                className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  versionMode === 'new' ? 'bg-card border border-border shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <GitBranch className="w-3.5 h-3.5" />
                New revision
              </button>
            </div>

            {versionMode === 'new' ? (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-muted-foreground shrink-0">Label:</span>
                <Input value={newRevLabel}
                  onChange={e => setNewRevLabel(e.target.value.toUpperCase().slice(0, 3))}
                  className="h-7 text-xs font-mono w-16 bg-background" placeholder="B" />
                <span className="text-xs text-muted-foreground">Rev {node.rev} is preserved in history.</span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mb-4">Overwrites Rev {node.rev} in place. No history entry is created.</div>
            )}
            {/* Change notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Change notes{versionMode === 'new' && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Textarea value={changeNotes} onChange={e => setChangeNotes(e.target.value)}
                placeholder={versionMode === 'new' ? 'Describe what changed in this revision…' : 'Optional: describe the correction made…'}
                className="text-sm bg-background border-border resize-none min-h-[60px]" rows={2} />
              {errors.notes && <p className="text-[11px] text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.notes}</p>}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-7 py-4 border-t border-border flex items-center justify-between gap-4 shrink-0 bg-card">
          <div className="text-sm text-muted-foreground">
            {activeTab === 'history'
              ? <span className="text-xs text-muted-foreground">Approval and rejection history for this part</span>
              : activeTab === 'documents'
                ? isEdit
                  ? versionMode === 'new'
                    ? <span>Will create <span className="font-mono font-medium text-foreground">Rev {newRevLabel || '?'}</span> — Rev {node?.rev} preserved in history</span>
                    : <span>Will overwrite <span className="font-mono font-medium text-foreground">Rev {node?.rev}</span> in place</span>
                  : 'New part will be added to the Bill of Materials'
                : <span className="text-xs text-muted-foreground">Step {wizardIndex(activeTab) + 1} of {TABS.length}</span>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="default" className="px-5" onClick={onClose} disabled={saving}>Cancel</Button>
            {(activeTab === 'history' || wizardIndex(activeTab) > 0) && (
              <Button variant="outline" size="default" className="gap-1.5 px-4" disabled={saving}
                onClick={() => { setErrors({}); setActiveTab(activeTab === 'history' ? 'documents' : TABS[wizardIndex(activeTab) - 1]); }}>
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {activeTab === 'history' ? null : activeTab !== 'documents' ? (
              <Button size="default" className="gap-1.5 px-5" onClick={handleNext}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="default" className="gap-2 px-6"
                disabled={saving || (isEdit && versionMode === 'new' && !changeNotes.trim())}
                onClick={handleSave}>
                <Save className="w-4 h-4" />
                {saving
                  ? 'Saving…'
                  : isEdit
                    ? versionMode === 'new' ? `Save as Rev ${newRevLabel || '?'}` : 'Save Changes'
                    : 'Add Part'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Reject confirmation (mandatory reason) */}
    <BOMRejectDialog
      open={showRejectDialog}
      partLabel={node?.pn}
      onClose={() => setShowRejectDialog(false)}
      onConfirm={handleRejectConfirm}
    />
    </>
  );
}
