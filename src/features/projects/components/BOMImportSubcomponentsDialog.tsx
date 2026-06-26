/**
 * BOMImportSubcomponentsDialog — bulk-add sub-components to a BOM node from an .xlsx/.xls file.
 * Stages: upload (template + file picker) → preview (validated rows) → result (import progress/summary).
 */
import { useRef, useState } from 'react';
import type { Workbook, Worksheet } from 'exceljs';
import Papa from 'papaparse';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FileSpreadsheet, Download, Upload, ChevronLeft, AlertCircle, CheckCircle2,
  Loader2, X,
} from 'lucide-react';
import {
  BOMNode, ApiPartResponse, ParsedImportRow,
  SUBCOMPONENT_IMPORT_COLUMNS, parseSubcomponentImportRows,
  checkColumnMappingConfidence, applyColumnMapping,
} from './bomData';
import { useOrgParts, useCreatePart } from '@/hooks/useParts';
import { useCreateBomNode, useMapImportColumns } from '@/hooks/useBom';
import { useAuth } from '@/modules/auth';

const MAX_IMPORT_ROWS = 200;
const CATEGORY_NOTE = 'assembly, power, control, connector, enclosure, hmi, safety — or any custom category';
const STATUS_NOTE = 'approved, pending (default: pending)';

interface ImportResult {
  row: ParsedImportRow;
  success: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  parentNode: BOMNode;
  projectId: string;
  orgId: string;
}

function sheetToRows(sheet: Worksheet): { headers: string[]; rows: Record<string, unknown>[] } {
  const headerCells: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headerCells[colNumber] = String(cell.value ?? '').trim();
  });
  const headers = headerCells.filter(Boolean);

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headerCells[colNumber];
      if (header) obj[header] = cell.value;
    });
    const hasData = Object.values(obj).some(v => v != null && String(v).trim() !== '');
    if (hasData) rows.push(obj);
  });
  return { headers, rows };
}

async function buildTemplateWorkbook(): Promise<Workbook> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();

  const sheet = workbook.addWorksheet('Sub-components');
  sheet.addRow(SUBCOMPONENT_IMPORT_COLUMNS.map(c => c.label));
  sheet.addRow([
    'EV-CONN-010', 'Charging port connector, IP67', 'connector', 'pending',
    'Acme Corp', 'ACM-1234', 'Acme Distribution', '12.50', '4', '2', 'EA',
  ]);
  sheet.columns.forEach(col => { col.width = 20; });
  sheet.getRow(1).font = { bold: true };

  const instructions = workbook.addWorksheet('Instructions');
  instructions.addRow(['Column', 'Required', 'Notes']);
  instructions.getRow(1).font = { bold: true };
  const notes: Record<string, string> = {
    'Part Number': 'Unique per organization. A part number matching an existing part attaches that part instead of creating a duplicate.',
    'Category': `One of: ${CATEGORY_NOTE}`,
    'Status': STATUS_NOTE,
    'MPN': 'Manufacturer part number',
    'Unit Price': 'Numeric, e.g. 12.50',
    'Lead Time (weeks)': 'Numeric, e.g. 4',
    'Quantity': 'Numeric, must be greater than 0',
    'UOM': 'e.g. EA, SET, KG (default: EA)',
  };
  SUBCOMPONENT_IMPORT_COLUMNS.forEach(c => {
    instructions.addRow([c.label, c.required ? 'Yes' : 'No', notes[c.label] ?? '']);
  });
  instructions.columns.forEach(col => { col.width = 24; });

  return workbook;
}

async function downloadTemplate() {
  const workbook = await buildTemplateWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'subcomponent-import-template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export function BOMImportSubcomponentsDialog({ open, onClose, parentNode, projectId, orgId }: Props) {
  const [stage, setStage] = useState<'upload' | 'preview' | 'result'>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResult[]>([]);
  const [mappingInProgress, setMappingInProgress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: partsData } = useOrgParts(orgId, { limit: 100 });
  const existingParts: ApiPartResponse[] = partsData?.data ?? [];

  const createPart = useCreatePart(orgId);
  const createNode = useCreateBomNode(projectId);
  const mapImportColumns = useMapImportColumns();
  const { user } = useAuth();

  const reset = () => {
    setStage('upload'); setFileName(null); setFileError(null);
    setParsedRows([]); setProgress({ done: 0, total: 0 }); setResults([]);
    setMappingInProgress(false);
    setIsDragging(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleDragOver = (e: React.DragEvent) => {
    if (mappingInProgress) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (mappingInProgress) return;
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (mappingInProgress) return;
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setFileName(file.name);
    try {
      let headers: string[] = [];
      let rawRows: Record<string, unknown>[] = [];
      
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      
      if (isCsv) {
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });
        
        if (result.errors.length > 0 && result.data.length === 0) {
          throw new Error('Failed to parse CSV file: ' + result.errors[0].message);
        }
        
        headers = result.meta.fields || [];
        rawRows = result.data as Record<string, unknown>[];
      } else {
        const buffer = await file.arrayBuffer();
        const { Workbook } = await import('exceljs');
        const workbook = new Workbook();
        await workbook.xlsx.load(buffer as unknown as Buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error('No sheet found in this file.');

        const parsed = sheetToRows(sheet);
        headers = parsed.headers;
        rawRows = parsed.rows;
      }

      if (rawRows.length === 0) throw new Error('No data rows found below the header.');
      if (rawRows.length > MAX_IMPORT_ROWS) {
        throw new Error(`This file has ${rawRows.length} rows — imports are capped at ${MAX_IMPORT_ROWS} rows per file.`);
      }

      const { confident } = checkColumnMappingConfidence(headers);
      if (confident) {
        setParsedRows(parseSubcomponentImportRows(rawRows, existingParts));
        setStage('preview');
        return;
      }

      setMappingInProgress(true);
      try {
        const { mapping } = await mapImportColumns.mutateAsync({ headers, sampleRows: rawRows.slice(0, 3) });
        const remappedRows = applyColumnMapping(rawRows, mapping);
        setParsedRows(parseSubcomponentImportRows(remappedRows, existingParts));
        setStage('preview');
      } catch (mapErr) {
        // 422 means the backend rejected the file as not BOM/parts-related —
        // surface that specific reason. Any other failure (timeout, 5xx,
        // misconfigured Azure OpenAI) gets a generic fallback message.
        const status = (mapErr as { response?: { status?: number } })?.response?.status;
        if (status === 422 && mapErr instanceof Error && mapErr.message) {
          throw mapErr;
        }
        throw new Error("Couldn't automatically map these columns. Please use the template format and try again.");
      } finally {
        setMappingInProgress(false);
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not read this file.');
      setFileName(null);
    }
  };

  const validRows = parsedRows.filter(r => r.errors.length === 0);

  const handleImport = async () => {
    setStage('result');
    setProgress({ done: 0, total: validRows.length });
    const acc: ImportResult[] = [];
    for (const row of validRows) {
      try {
        let partId = row.existingPart?.id;
        if (!partId) {
          const part = await createPart.mutateAsync({
            partNumber:          row.partNumber,
            description:         row.description,
            category:            row.category as ApiPartResponse['category'],
            manufacturer:        row.manufacturer || undefined,
            distributor:         row.supplier || undefined,
            mpn:                 row.mpn || undefined,
            unit:                row.uom,
            initialStatus:       row.status,
            initialPrice:        row.unitPrice && row.unitPrice > 0 ? row.unitPrice : undefined,
            initialLeadTimeDays: row.leadTimeWeeks && row.leadTimeWeeks > 0 ? row.leadTimeWeeks * 7 : undefined,
          });
          partId = part.id;
        }
        await createNode.mutateAsync({
          partId, quantity: row.quantity, unit: row.uom,
          status: row.status, parentId: parentNode.id,
          // Imported rows have no per-row owner picker — default to whoever ran the import.
          ownerId: user?.id,
        });
        acc.push({ row, success: true });
      } catch (err) {
        acc.push({ row, success: false, error: err instanceof Error ? err.message : 'Import failed' });
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
      setResults([...acc]);
    }
  };

  const importing = stage === 'result' && progress.done < progress.total;
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Import Sub-components
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bulk-add sub-components to <span className="font-mono text-foreground">{parentNode.pn}</span> from a spreadsheet.
          </DialogDescription>
        </DialogHeader>

        {stage === 'upload' && (
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Download className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                Not sure about the format? Download a template with the required columns and an example row.
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>Download template</Button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => { if (!mappingInProgress) fileInputRef.current?.click(); }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors',
                mappingInProgress ? 'cursor-not-allowed opacity-70 border-border bg-muted/20' : 
                isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 cursor-pointer',
              )}
              style={{ height: 160 }}
            >
              {mappingInProgress ? (
                <>
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  <span className="text-sm text-foreground font-medium">Analyzing column headers with AI…</span>
                  <span className="text-[11px] text-muted-foreground">These headers don't match our template — mapping them automatically</span>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-muted-foreground/50" />
                  <span className="text-sm text-foreground font-medium">Click to upload a spreadsheet</span>
                  <span className="text-[11px] text-muted-foreground">.xlsx, .xls, or .csv · up to {MAX_IMPORT_ROWS} rows</span>
                  {fileName && !fileError && <span className="text-[11px] text-primary mt-1">{fileName}</span>}
                </>
              )}
            </div>
            <input
              ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={mappingInProgress}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {fileError && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        {stage === 'preview' && (
          <>
            <div className="px-5 pt-3 pb-2 shrink-0 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{validRows.length} valid</span>
                {parsedRows.length - validRows.length > 0 && (
                  <> · {parsedRows.length - validRows.length} will be skipped</>
                )}
              </span>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setStage('upload'); setFileName(null); }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0">
              <div className="space-y-1">
                {parsedRows.map(row => {
                  const isValid = row.errors.length === 0;
                  return (
                    <div key={row.rowNumber}
                      className={cn(
                        'flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs',
                        isValid ? 'border-border' : 'border-destructive/30 bg-destructive/5 opacity-70',
                      )}
                    >
                      {isValid
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-medium text-foreground">{row.partNumber || `Row ${row.rowNumber}`}</span>
                          <span className="text-muted-foreground truncate">{row.description}</span>
                          {row.existingPart && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              Existing part — will attach, not duplicate
                            </span>
                          )}
                        </div>
                        {!isValid && (
                          <div className="text-destructive mt-0.5">{row.errors.join(' · ')}</div>
                        )}
                      </div>
                      <span className="text-muted-foreground shrink-0">Row {row.rowNumber}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-border flex items-center justify-end gap-2 bg-card shrink-0">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button disabled={validRows.length === 0} onClick={handleImport}>
                Import {validRows.length} {validRows.length === 1 ? 'Part' : 'Parts'}
              </Button>
            </div>
          </>
        )}

        {stage === 'result' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 flex flex-col gap-3">
              {importing ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  Importing {progress.done} of {progress.total}…
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {failureCount === 0
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <AlertCircle className="w-4 h-4 text-amber-500" />}
                  {successCount} imported{failureCount > 0 && ` · ${failureCount} failed`}
                </div>
              )}
              <div className="space-y-1">
                {results.map(r => (
                  <div key={r.row.rowNumber}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs',
                      r.success ? 'border-border' : 'border-destructive/30 bg-destructive/5',
                    )}
                  >
                    {r.success
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      : <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    <span className="font-mono font-medium text-foreground">{r.row.partNumber}</span>
                    <span className="text-muted-foreground truncate flex-1">{r.row.description}</span>
                    {r.error && <span className="text-destructive shrink-0">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-border flex items-center justify-end bg-card shrink-0">
              <Button disabled={importing} onClick={handleClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
