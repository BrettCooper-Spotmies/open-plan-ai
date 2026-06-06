/**
 * BOMPartSheet — centred full-size dialog for Add / Edit a BOM part.
 * Tabs: Details · Sourcing · Traceability · Documents
 * Edit mode shows version management inline.
 */
import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Zap, Cpu, Package, Box, Monitor, Shield, Layers, User,
  CheckCircle, Clock, GitBranch, Save, Plus, X,
  FileText, ImageIcon, Upload, Paperclip, AlertCircle,
} from 'lucide-react';
import {
  BOMNode, BOMStatus, BOMCategory, BOM_CAT_META, BOMRevision,
} from './bomData';

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
  req: string[];
  // documents (File objects; null = cleared, undefined = unchanged)
  docPhoto?: File | null;
  docDatasheet?: File | null;
  doc3DModel?: File | null;
  docFootprint?: File | null;
  // edit-only version fields
  versionMode?: 'same' | 'new';
  newRevLabel?: string;
  changeNotes?: string;
}

interface Props {
  mode: 'add' | 'edit';
  node?: BOMNode;           // required when mode === 'edit'
  open: boolean;
  onClose: () => void;
  onSave: (payload: BOMPartPayload) => void;
}

// ── Constants ─────────────────────────────────────────────────────
const LETTERS = 'ABCDEFGHIJ';
const CATEGORIES: BOMCategory[] = ['assembly', 'power', 'control', 'connector', 'enclosure', 'hmi', 'safety'];
const CAT_ICONS: Record<BOMCategory, React.ElementType> = {
  assembly: Layers, power: Zap, control: Cpu, connector: Package,
  enclosure: Box, hmi: Monitor, safety: Shield,
};
const UOM_OPTIONS = ['EA', 'SET', 'LIC', 'KG', 'M', 'FT', 'PCS', 'LOT'];

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

// ── File upload row ────────────────────────────────────────────────
interface FileRowProps {
  icon: React.ElementType;
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
}
function FileRow({ icon: Icon, label, hint, accept, file, onChange }: FileRowProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {file ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-primary font-medium truncate max-w-[220px]">{file.name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {file && (
          <button onClick={() => onChange(null)}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-background hover:bg-muted transition-colors">
          <Upload className="w-3 h-3" /> {file ? 'Replace' : 'Upload'}
        </button>
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
}

// ── Photo upload ───────────────────────────────────────────────────
function PhotoUpload({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Product Photo
      </Label>
      <div
        onClick={() => ref.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors',
          file ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30',
        )}
        style={{ height: 140 }}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
              <span className="text-xs text-white font-medium">Click to replace</span>
            </div>
          </>
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <span className="text-xs text-muted-foreground">Click to upload product photo</span>
            <span className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG, WEBP · max 10 MB</span>
          </>
        )}
      </div>
      {file && (
        <button onClick={() => onChange(null)} className="text-[11px] text-destructive hover:underline">
          Remove photo
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export function BOMPartSheet({ mode, node, open, onClose, onSave }: Props) {
  const isEdit = mode === 'edit';

  // ── Form state ──
  const [pn,           setPn]           = useState(node?.pn ?? '');
  const [desc,         setDesc]         = useState(node?.desc ?? '');
  const [category,     setCategory]     = useState<BOMCategory>(node?.cat ?? 'assembly');
  const [status,       setStatus]       = useState<BOMStatus>(node?.status ?? 'pending');
  const [rev,          setRev]          = useState(node?.rev ?? 'A');
  const [qty,          setQty]          = useState(String(node?.qty ?? 1));
  const [uom,          setUom]          = useState(node?.uom ?? 'EA');
  const [manufacturer, setManufacturer] = useState(node?.manufacturer ?? '');
  const [distributor,  setDistributor]  = useState(node?.distributor ?? '');
  const [price,        setPrice]        = useState(String(node?.price ?? ''));
  const [leadTime,     setLeadTime]     = useState(String(node?.leadTime ?? ''));
  const [mpn,          setMpn]          = useState(node?.mpn ?? '');
  const [owner,        setOwner]        = useState(node?.owner ?? '');
  const [req,          setReq]          = useState<string[]>(node?.req ?? []);
  const [reqInput,     setReqInput]     = useState('');
  // documents
  const [docPhoto,     setDocPhoto]     = useState<File | null>(null);
  const [docDatasheet, setDocDatasheet] = useState<File | null>(null);
  const [doc3DModel,   setDoc3DModel]   = useState<File | null>(null);
  const [docFootprint, setDocFootprint] = useState<File | null>(null);
  // edit: version
  const [versionMode,  setVersionMode]  = useState<'same' | 'new'>('same');
  const [newRevLabel,  setNewRevLabel]  = useState(node ? nextRev(node.rev) : 'B');
  const [changeNotes,  setChangeNotes]  = useState('');
  // validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addReq = () => {
    const v = reqInput.trim().toUpperCase();
    if (v && !req.includes(v)) { setReq(r => [...r, v]); }
    setReqInput('');
  };
  const removeReq = (r: string) => setReq(rs => rs.filter(x => x !== r));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isEdit && !pn.trim())          e.pn = 'Part number is required';
    if (!desc.trim())                   e.desc = 'Description is required';
    if (!manufacturer.trim())           e.mfr = 'Manufacturer is required';
    if (isEdit && versionMode === 'new' && !changeNotes.trim()) e.notes = 'Change notes are required when creating a new revision';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      mode,
      pn: isEdit ? (node?.pn ?? pn) : pn.trim(),
      desc, category, status,
      rev: isEdit ? (versionMode === 'new' ? (newRevLabel || nextRev(node!.rev)) : node!.rev) : rev,
      qty: parseFloat(qty) || 1,
      uom,
      manufacturer, distributor,
      price: parseFloat(price) || 0,
      leadTime: parseInt(leadTime) || 0,
      mpn, owner, req,
      docPhoto, docDatasheet, doc3DModel, docFootprint,
      versionMode: isEdit ? versionMode : undefined,
      newRevLabel: isEdit && versionMode === 'new' ? newRevLabel : undefined,
      changeNotes: isEdit ? changeNotes : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
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
        <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TabsList className="mx-7 mt-4 mb-0 shrink-0 bg-muted/50 h-9 w-auto self-start gap-0.5">
            <TabsTrigger value="details"      className="text-xs px-4">Details</TabsTrigger>
            <TabsTrigger value="sourcing"     className="text-xs px-4">Sourcing</TabsTrigger>
            <TabsTrigger value="traceability" className="text-xs px-4">Traceability</TabsTrigger>
            <TabsTrigger value="documents"    className="text-xs px-4">Documents</TabsTrigger>
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
                  <div className="flex gap-2">
                    {(['approved', 'pending'] as BOMStatus[]).map(s => (
                      <button key={s} onClick={() => setStatus(s)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors',
                          status === s ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        )}>
                        {s === 'approved'
                          ? <CheckCircle className="w-4 h-4" style={{ color: '#16A34A' }} />
                          : <Clock className="w-4 h-4" style={{ color: '#D97706' }} />}
                        {s === 'approved' ? 'Approved' : 'Pending'}
                      </button>
                    ))}
                  </div>
                </FL>

                <FL label="Owner / Handled By">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <FInput value={owner} onChange={e => setOwner(e.target.value)}
                      placeholder="e.g. Sarah Chen" className="h-9 pl-9" />
                  </div>
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
              <FL label="Unit Price ($)">
                <FInput value={price} onChange={e => setPrice(e.target.value)}
                  type="number" step="0.01" placeholder="0.00" className="h-9" />
              </FL>
              <FL label="Lead Time (weeks)">
                <FInput value={leadTime} onChange={e => setLeadTime(e.target.value)}
                  type="number" placeholder="8" className="h-9" />
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
                <PhotoUpload file={docPhoto} onChange={setDocPhoto} />
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-3">
                  Technical Files
                </Label>
                <FileRow icon={FileText}  label="Datasheet"         hint="PDF · Manufacturer datasheet"
                  accept=".pdf,application/pdf" file={docDatasheet} onChange={setDocDatasheet} />
                <FileRow icon={Paperclip} label="3D Model (STEP)"   hint=".step, .stp · CAD model file"
                  accept=".step,.stp"           file={doc3DModel}   onChange={setDoc3DModel} />
                <FileRow icon={Paperclip} label="Footprint Library" hint=".kicad_mod, .lib · EDA footprint"
                  accept=".kicad_mod,.lib,.lbr" file={docFootprint} onChange={setDocFootprint} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Version section (Edit only) — side-by-side ── */}
        {isEdit && node && (
          <div className="px-7 pt-5 pb-4 border-t border-border bg-muted/20 shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Save as Version
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className={cn('flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors',
                versionMode === 'same' ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-background')}>
                <input type="radio" name="vmode" checked={versionMode === 'same'}
                  onChange={() => setVersionMode('same')} className="mt-0.5 accent-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground mb-0.5">
                    Update <span className="font-mono">Rev {node.rev}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Overwrites the current revision in place. No new history entry is created.</div>
                </div>
              </label>
              <label className={cn('flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors',
                versionMode === 'new' ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-background')}>
                <input type="radio" name="vmode" checked={versionMode === 'new'}
                  onChange={() => setVersionMode('new')} className="mt-0.5 accent-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground">Create new revision</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Appends a new revision. <span className="font-mono">Rev {node.rev}</span> is preserved in history.
                  </div>
                  {versionMode === 'new' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground shrink-0">New label:</span>
                      <Input value={newRevLabel}
                        onChange={e => setNewRevLabel(e.target.value.toUpperCase().slice(0, 3))}
                        className="h-7 text-xs font-mono w-20 bg-background" placeholder="B"
                        onClick={e => e.stopPropagation()} />
                    </div>
                  )}
                </div>
              </label>
            </div>
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
            {isEdit
              ? versionMode === 'new'
                ? <span>Will create <span className="font-mono font-medium text-foreground">Rev {newRevLabel || '?'}</span> — Rev {node?.rev} preserved in history</span>
                : <span>Will overwrite <span className="font-mono font-medium text-foreground">Rev {node?.rev}</span> in place</span>
              : 'New part will be added to the Bill of Materials'}
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="outline" size="default" className="px-6" onClick={onClose}>Cancel</Button>
            <Button size="default" className="gap-2 px-6"
              disabled={isEdit && versionMode === 'new' && !changeNotes.trim()}
              onClick={handleSave}>
              <Save className="w-4 h-4" />
              {isEdit
                ? versionMode === 'new' ? `Save as Rev ${newRevLabel || '?'}` : 'Save Changes'
                : 'Add Part'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
