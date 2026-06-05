/**
 * BOMDocuments — enhanced document attachments card for the BOM detail screen.
 * Features per-document View / Download / Update actions, and an Add modal
 * that supports both file upload and URL link.
 */
import { useState, useRef } from 'react';
import {
  FileText, Box, Cpu, ImageIcon, Link2, Upload, Download,
  Eye, Pencil, Plus, X, ExternalLink, File, Paperclip, Trash2, AlertCircle,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────
export interface DocItem {
  id: string;
  icon: React.ElementType;
  label: string;
  defaultName: string;   // placeholder filename shown when nothing is uploaded
  file?: File | null;    // actual uploaded file
  linkUrl?: string;      // external URL (mutually exclusive with file)
  isFixed?: boolean;     // built-in system document slot (can't be deleted)
}

// ── Helpers ────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function viewDocument(doc: DocItem) {
  if (doc.linkUrl) { window.open(doc.linkUrl, '_blank', 'noopener'); return; }
  if (doc.file) { window.open(URL.createObjectURL(doc.file), '_blank', 'noopener'); }
}

function downloadDocument(doc: DocItem) {
  if (doc.file) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(doc.file);
    a.download = doc.file.name;
    a.click();
    return;
  }
  if (doc.linkUrl) { window.open(doc.linkUrl, '_blank', 'noopener'); }
}

// ── Single document row ───────────────────────────────────────────
function DocRow({
  doc,
  onUpdate,
  onRemove,
}: {
  doc: DocItem;
  onUpdate: (id: string, file: File | null, linkUrl?: string) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const Icon = doc.icon;
  const hasContent = !!(doc.file || doc.linkUrl);
  const isLink = !!doc.linkUrl && !doc.file;

  const displayName = doc.file
    ? doc.file.name
    : doc.linkUrl
      ? doc.linkUrl
      : doc.defaultName;

  const displaySub = doc.file
    ? formatBytes(doc.file.size)
    : doc.linkUrl
      ? 'External link'
      : 'Awaiting upload';

  return (
    <div className="group flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors hover:bg-muted/30">
      {/* Icon */}
      <div className={cn(
        'w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
        hasContent
          ? 'bg-primary/8 border-primary/20'
          : 'bg-muted border-border'
      )}>
        {isLink
          ? <Link2 className="w-4 h-4" style={{ color: hasContent ? '#2563EB' : undefined }} />
          : <Icon className={cn('w-4 h-4', hasContent ? 'text-primary' : 'text-muted-foreground')} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-foreground">{doc.label}</div>
        <div className={cn(
          'text-[11px] truncate max-w-[200px]',
          hasContent ? 'text-muted-foreground' : 'text-muted-foreground/50 italic'
        )}>
          {isLink ? (
            <span className="text-primary/80 hover:text-primary transition-colors">
              {displayName}
            </span>
          ) : displayName}
          {doc.file && (
            <span className="ml-1.5 text-muted-foreground/60">· {displaySub}</span>
          )}
        </div>
      </div>

      {/* Actions — always visible for uploaded, hover-only for empty */}
      <div className={cn(
        'flex items-center gap-0.5 shrink-0 transition-opacity',
        hasContent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        {hasContent && (
          <>
            <ActionBtn
              icon={isLink ? ExternalLink : Eye}
              label="View"
              onClick={() => viewDocument(doc)}
            />
            {!isLink && (
              <ActionBtn
                icon={Download}
                label="Download"
                onClick={() => downloadDocument(doc)}
              />
            )}
          </>
        )}
        <ActionBtn
          icon={Pencil}
          label={hasContent ? 'Update' : 'Upload'}
          onClick={() => fileRef.current?.click()}
        />
        {!doc.isFixed && hasContent && (
          <ActionBtn
            icon={Trash2}
            label="Remove"
            danger
            onClick={() => onRemove(doc.id)}
          />
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={e => onUpdate(doc.id, e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, danger,
}: {
  icon: React.ElementType; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={cn(
        'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
        danger
          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Add Document Dialog ────────────────────────────────────────────
type AddMode = 'upload' | 'link';

function AddDocDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (doc: Omit<DocItem, 'id' | 'isFixed'>) => void;
}) {
  const [mode, setMode]       = useState<AddMode>('upload');
  const [label, setLabel]     = useState('');
  const [file, setFile]       = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError]     = useState('');
  const dropRef               = useRef<HTMLDivElement>(null);
  const fileRef               = useRef<HTMLInputElement>(null);

  const reset = () => { setLabel(''); setFile(null); setLinkUrl(''); setError(''); setMode('upload'); };

  const handleAdd = () => {
    if (!label.trim()) { setError('Please enter a label for this document.'); return; }
    if (mode === 'upload' && !file) { setError('Please select a file to upload.'); return; }
    if (mode === 'link' && !linkUrl.trim()) { setError('Please enter a URL.'); return; }
    if (mode === 'link' && !/^https?:\/\/.+/.test(linkUrl.trim())) {
      setError('URL must start with http:// or https://');
      return;
    }
    onAdd({
      icon: mode === 'link' ? Link2 : File,
      label: label.trim(),
      defaultName: mode === 'link' ? linkUrl.trim() : (file?.name ?? ''),
      file: mode === 'upload' ? file : null,
      linkUrl: mode === 'link' ? linkUrl.trim() : undefined,
    });
    reset();
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!label) setLabel(f.name.replace(/\.[^/.]+$/, '')); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-semibold">Add Document</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload a file from your device or attach an external link.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="px-5 pt-4">
          <div className="flex bg-muted border border-border rounded-lg p-0.5 gap-0.5 w-fit">
            {([['upload', Upload, 'Upload File'], ['link', Link2, 'Add Link']] as const).map(([m, Icon, lbl]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={cn(
                  'flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors',
                  mode === m ? 'bg-card text-foreground shadow-sm' : 'bg-transparent text-muted-foreground hover:text-foreground'
                )}>
                <Icon className="w-3.5 h-3.5" />
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Upload mode */}
          {mode === 'upload' ? (
            <div
              ref={dropRef}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                file
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/40'
              )}
              style={{ minHeight: 120 }}
            >
              {file ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <File className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <span className="text-sm font-medium text-foreground">Drop file here or click to browse</span>
                  <span className="text-xs text-muted-foreground mt-0.5">PDF, STEP, KICAD, images, or any file</span>
                </>
              )}
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setFile(f); if (!label) setLabel(f.name.replace(/\.[^/.]+$/, '')); }
                }} />
            </div>
          ) : (
            /* Link mode */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</Label>
                <div className="flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-2">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://example.com/datasheet.pdf"
                    className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Datasheet Rev B, Test Report, 3D Model"
              className="h-8 text-sm bg-muted border-border"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 bg-card">
          <Button variant="outline" size="sm" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button size="sm" className="gap-1.5" onClick={handleAdd}>
            {mode === 'upload' ? <Upload className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {mode === 'upload' ? 'Upload File' : 'Add Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────
export function BOMDocuments({ pn, mpn, rev }: { pn: string; mpn: string; rev: string }) {
  const [docs, setDocs] = useState<DocItem[]>([
    { id: 'datasheet', icon: FileText, label: 'Datasheet',        defaultName: `${mpn}_rev${rev}.pdf`,   isFixed: true },
    { id: '3dmodel',   icon: Box,      label: '3D Model (STEP)',   defaultName: `${pn}.step`,             isFixed: true },
    { id: 'footprint', icon: Cpu,      label: 'Footprint Library', defaultName: `${pn}.kicad_mod`,       isFixed: true },
    { id: 'photo',     icon: ImageIcon,label: 'Product Photo',     defaultName: 'Awaiting upload',       isFixed: true },
  ]);
  const [addOpen, setAddOpen] = useState(false);

  const handleUpdate = (id: string, file: File | null, linkUrl?: string) => {
    setDocs(ds => ds.map(d => d.id === id ? { ...d, file, linkUrl } : d));
  };
  const handleRemove = (id: string) => {
    setDocs(ds => ds.filter(d => d.id !== id));
  };
  const handleAdd = (doc: Omit<DocItem, 'id' | 'isFixed'>) => {
    setDocs(ds => [...ds, { ...doc, id: `custom-${Date.now()}`, isFixed: false }]);
  };

  const uploadedCount = docs.filter(d => d.file || d.linkUrl).length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Documents</span>
          {uploadedCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {uploadedCount} attached
            </span>
          )}
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add file
        </button>
      </div>

      {/* Document rows */}
      <div>
        {docs.map(doc => (
          <DocRow
            key={doc.id}
            doc={doc}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <AddDocDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
