/**
 * BOMGoogleSheetsPullDialog — Pull (Import) preview/confirm. Implements the
 * row classification + required-field/ambiguous-unit resolution flow from
 * GOOGLE_SHEETS_BOM_INTEGRATION.md §1/Step 5. Confirm & Import stays
 * disabled until every flagged row is either resolved or explicitly skipped
 * — nothing commits from this screen without that.
 *
 * Per-row skip: a flagged row (needs-input or ambiguous-unit) can be
 * excluded from the import entirely — useful for junk/blank rows that
 * shouldn't become parts at all. Skipped rows are dropped from the commit
 * payload just like already-unchanged rows. Column-level unmatched/
 * ambiguous headers are still just an informational banner, not an
 * interactive remap UI.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ArrowDownToLine, CheckCircle2, AlertCircle, ChevronDown, Sparkles, X, Undo2 } from 'lucide-react';
import { useGoogleSheetsImportPreview, useGoogleSheetsImportCommit } from '@/hooks/useGoogleSheets';
import type { ImportRowPreview, ImportRowResolution, ImportCommitResult } from '@/services/googleSheets.service';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

type LeadTimeUnit = 'days' | 'weeks' | 'months';
const UNIT_MULTIPLIER: Record<LeadTimeUnit, number> = { days: 1, weeks: 7, months: 30 };
// Mirrors BOMPartSheet's required-field set for a brand-new part — Owner
// ("Handled By") is deliberately excluded: it's never asked here, the
// importing user is always set as owner automatically (see commitImport).
// Supplier/Unit Price only ever appear in missingRequiredFields for
// brand-new parts (see the backend's NEW_PART_REQUIRED_FIELDS) — an existing
// part being merely updated on some other column isn't forced to gain them.
const REQUIRED_FIELD_ORDER = ['Part Number', 'Part Name', 'Description', 'Category', 'Manufacturer', 'MPN', 'Supplier', 'Unit Price', 'Quantity'] as const;

export default function BOMGoogleSheetsPullDialog({ open, onClose, projectId }: Props) {
  const preview = useGoogleSheetsImportPreview(projectId);
  const commit = useGoogleSheetsImportCommit(projectId);

  const [fieldEdits, setFieldEdits] = useState<Record<number, Record<string, string>>>({});
  const [unitEdits, setUnitEdits] = useState<Record<number, LeadTimeUnit>>({});
  const [leadTimeValueEdits, setLeadTimeValueEdits] = useState<Record<number, string>>({});
  const [bulkUnit, setBulkUnit] = useState<LeadTimeUnit | ''>('');
  const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  useEffect(() => {
    if (open) {
      setFieldEdits({});
      setUnitEdits({});
      setLeadTimeValueEdits({});
      setBulkUnit('');
      setSkippedRows(new Set());
      setResult(null);
      preview.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const data = preview.data;

  const rowsByStatus = useMemo(() => {
    const grouped: Record<ImportRowPreview['status'], ImportRowPreview[]> = {
      'needs-input': [], 'ambiguous-unit': [], 'new-part': [], 'matched-changed': [], 'matched-unchanged': [],
    };
    for (const row of data?.rows ?? []) grouped[row.status].push(row);
    return grouped;
  }, [data]);

  const resolvedFieldValue = (row: ImportRowPreview, field: string): string =>
    fieldEdits[row.rowIndex]?.[field] ?? row.aiSuggestions[field as keyof ImportRowPreview['aiSuggestions']] ?? '';

  const isRowFullyResolved = (row: ImportRowPreview): boolean => {
    if (skippedRows.has(row.rowIndex)) return true;
    if (row.status === 'needs-input') {
      const fieldsOk = row.missingRequiredFields.every((f) => resolvedFieldValue(row, f).trim() !== '');
      const leadTimeOk = !row.leadTimeRequired
        || (!!unitEdits[row.rowIndex] && (leadTimeValueEdits[row.rowIndex] ?? '').trim() !== '');
      return fieldsOk && leadTimeOk;
    }
    if (row.status === 'ambiguous-unit') {
      return !!unitEdits[row.rowIndex];
    }
    return true;
  };

  const allResolved = (data?.rows ?? []).every(isRowFullyResolved);

  const handleFieldChange = (rowIndex: number, field: string, value: string) => {
    setFieldEdits((prev) => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [field]: value } }));
  };

  const applyBulkUnit = (unit: LeadTimeUnit) => {
    setBulkUnit(unit);
    const next: Record<number, LeadTimeUnit> = { ...unitEdits };
    for (const row of rowsByStatus['ambiguous-unit']) next[row.rowIndex] = unit;
    setUnitEdits(next);
  };

  const toggleSkipRow = (rowIndex: number) => {
    setSkippedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const handleConfirm = async () => {
    const resolutions: ImportRowResolution[] = (data?.rows ?? [])
      .filter((r) => r.status !== 'matched-unchanged' && !skippedRows.has(r.rowIndex))
      .map((row) => {
        const resolution: ImportRowResolution = { rowIndex: row.rowIndex };
        if (row.status === 'needs-input') {
          const resolved: Record<string, string> = {};
          for (const field of row.missingRequiredFields) resolved[field] = resolvedFieldValue(row, field);
          resolution.resolvedRequiredFields = resolved as ImportRowResolution['resolvedRequiredFields'];
        }
        const unit = unitEdits[row.rowIndex];
        if (row.leadTimeRequired) {
          const value = leadTimeValueEdits[row.rowIndex];
          if (unit && value) {
            resolution.resolvedLeadTimeDays = Number(value) * UNIT_MULTIPLIER[unit];
          }
        } else if (unit && row.leadTimeRaw) {
          resolution.resolvedLeadTimeDays = Number(row.leadTimeRaw) * UNIT_MULTIPLIER[unit];
        }
        return resolution;
      });

    const res = await commit.mutateAsync(resolutions);
    setResult(res);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const hasAnyWork = data
    ? data.rows.some((r) => r.status !== 'matched-unchanged' && !skippedRows.has(r.rowIndex))
    : false;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
            Pull from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Review what would change before anything writes to your BOM.
          </DialogDescription>
        </DialogHeader>

        {preview.isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the sheet and matching against your BOM...
          </div>
        )}

        {preview.isError && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-destructive">
            <AlertCircle className="h-5 w-5" />
            Couldn't load the Pull preview.
            <Button variant="outline" size="sm" onClick={() => preview.mutate()}>Retry</Button>
          </div>
        )}

        {result && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Import complete</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>{result.createdCount} part(s) created</li>
              <li>{result.updatedCount} part(s) updated</li>
              {result.failedCount > 0 && <li className="text-destructive">{result.failedCount} row(s) failed</li>}
            </ul>
            {result.failedCount > 0 && (
              <ScrollArea className="max-h-40 rounded-md border border-border p-2">
                <div className="space-y-1">
                  {result.results.filter((r) => r.outcome === 'failed').map((r) => (
                    <div key={r.rowIndex} className="text-xs">
                      <span className="font-medium text-foreground">{r.partNumber || `Row ${r.rowIndex + 1}`}</span>{' '}
                      <span className="text-destructive">— {r.reason}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {data && !result && (
          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-5 py-2">
              {(data.unmatchedColumns.length > 0 || data.ambiguousColumns.length > 0) && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground space-y-1">
                  {data.unmatchedColumns.length > 0 && (
                    <p>{data.unmatchedColumns.length} column(s) didn't match a BOM field and will be imported as custom fields: {data.unmatchedColumns.join(', ')}</p>
                  )}
                  {data.ambiguousColumns.length > 0 && (
                    <p>{data.ambiguousColumns.length} column(s) were ambiguous and weren't imported: {data.ambiguousColumns.join(', ')}</p>
                  )}
                </div>
              )}

              {!hasAnyWork && (
                <p className="text-sm text-muted-foreground">Nothing to import — the sheet already matches your BOM.</p>
              )}

              {rowsByStatus['needs-input'].length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Needs your input — {rowsByStatus['needs-input'].length} row(s) are missing required fields
                    {rowsByStatus['needs-input'].some((r) => skippedRows.has(r.rowIndex)) && (
                      <span className="text-muted-foreground font-normal">
                        {' '}({rowsByStatus['needs-input'].filter((r) => skippedRows.has(r.rowIndex)).length} skipped)
                      </span>
                    )}
                  </p>
                  <div className="max-h-[26rem] overflow-y-auto rounded-md border border-border p-4 space-y-3">
                    {rowsByStatus['needs-input'].map((row) => {
                      const skipped = skippedRows.has(row.rowIndex);
                      return (
                        <div
                          key={row.rowIndex}
                          className={`rounded-md border p-3 space-y-2 ${skipped ? 'border-border bg-muted/30' : 'border-amber-500/30'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              Row {row.rowIndex + 1}{row.partNumber ? ` — ${row.partNumber}` : ''}
                            </p>
                            {skipped ? (
                              <Button
                                type="button" variant="ghost" size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground"
                                onClick={() => toggleSkipRow(row.rowIndex)}
                              >
                                <Undo2 className="h-3 w-3 mr-1" /> Undo
                              </Button>
                            ) : (
                              <Button
                                type="button" variant="ghost" size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => toggleSkipRow(row.rowIndex)}
                              >
                                <X className="h-3 w-3 mr-1" /> Skip row
                              </Button>
                            )}
                          </div>
                          {skipped ? (
                            <p className="text-xs text-muted-foreground italic">Won't be imported.</p>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {REQUIRED_FIELD_ORDER.filter((f) => row.missingRequiredFields.includes(f)).map((field) => {
                                  const hasAiSuggestion = field in row.aiSuggestions;
                                  return (
                                    <div key={field} className="space-y-1">
                                      <Label className="text-xs flex items-center gap-1">
                                        {field}
                                        {hasAiSuggestion && <Sparkles className="h-3 w-3 text-primary" aria-label="AI-suggested" />}
                                      </Label>
                                      <Input
                                        className="h-8 text-sm"
                                        value={resolvedFieldValue(row, field)}
                                        placeholder={hasAiSuggestion ? undefined : 'Required'}
                                        onChange={(e) => handleFieldChange(row.rowIndex, field, e.target.value)}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              {row.leadTimeRequired && (
                                <div className="space-y-1 pt-1">
                                  <Label className="text-xs">Lead Time</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      className="h-8 text-sm w-24"
                                      type="text"
                                      inputMode="numeric"
                                      value={leadTimeValueEdits[row.rowIndex] ?? ''}
                                      placeholder="Required"
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                        setLeadTimeValueEdits((prev) => ({ ...prev, [row.rowIndex]: v }));
                                      }}
                                    />
                                    <Select
                                      value={unitEdits[row.rowIndex] ?? ''}
                                      onValueChange={(v) => setUnitEdits((prev) => ({ ...prev, [row.rowIndex]: v as LeadTimeUnit }))}
                                    >
                                      <SelectTrigger className="h-8 w-28 text-xs">
                                        <SelectValue placeholder="Unit?" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="days">Days</SelectItem>
                                        <SelectItem value="weeks">Weeks</SelectItem>
                                        <SelectItem value="months">Months</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {rowsByStatus['ambiguous-unit'].length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      Ambiguous lead time — {rowsByStatus['ambiguous-unit'].length} row(s) have no detectable unit
                    </p>
                    {rowsByStatus['ambiguous-unit'].length > 1 && (
                      <Select value={bulkUnit} onValueChange={(v) => applyBulkUnit(v as LeadTimeUnit)}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue placeholder="Apply to all..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">All are days</SelectItem>
                          <SelectItem value="weeks">All are weeks</SelectItem>
                          <SelectItem value="months">All are months</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {rowsByStatus['ambiguous-unit'].map((row) => {
                      const skipped = skippedRows.has(row.rowIndex);
                      return (
                        <div
                          key={row.rowIndex}
                          className={`flex items-center justify-between gap-3 rounded-md border p-2.5 ${skipped ? 'border-border bg-muted/30' : 'border-amber-500/30'}`}
                        >
                          <span className="text-xs">
                            <span className="font-medium text-foreground">{row.partNumber || `Row ${row.rowIndex + 1}`}</span>
                            {' — lead time '}"{row.leadTimeRaw}"
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {skipped ? (
                              <Button
                                type="button" variant="ghost" size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground"
                                onClick={() => toggleSkipRow(row.rowIndex)}
                              >
                                <Undo2 className="h-3 w-3 mr-1" /> Undo
                              </Button>
                            ) : (
                              <>
                                <Select
                                  value={unitEdits[row.rowIndex] ?? ''}
                                  onValueChange={(v) => setUnitEdits((prev) => ({ ...prev, [row.rowIndex]: v as LeadTimeUnit }))}
                                >
                                  <SelectTrigger className="h-8 w-28 text-xs">
                                    <SelectValue placeholder="Unit?" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="days">Days</SelectItem>
                                    <SelectItem value="weeks">Weeks</SelectItem>
                                    <SelectItem value="months">Months</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button" variant="ghost" size="sm"
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => toggleSkipRow(row.rowIndex)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {rowsByStatus['new-part'].length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">New parts — {rowsByStatus['new-part'].length}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rowsByStatus['new-part'].map((row) => (
                      <Badge key={row.rowIndex} variant="secondary" className="text-[11px]">{row.partNumber}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {rowsByStatus['matched-changed'].length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Changed — {rowsByStatus['matched-changed'].length}</p>
                  <div className="space-y-1.5">
                    {rowsByStatus['matched-changed'].map((row) => (
                      <div key={row.rowIndex} className="text-xs">
                        <span className="font-medium text-foreground">{row.partNumber}</span>{' '}
                        <span className="text-muted-foreground">— {row.changes.map((c) => c.field).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rowsByStatus['matched-unchanged'].length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-3.5 w-3.5" />
                    {rowsByStatus['matched-unchanged'].length} part(s) unchanged
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {rowsByStatus['matched-unchanged'].map((row) => (
                        <Badge key={row.rowIndex} variant="outline" className="text-[11px]">{row.partNumber}</Badge>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Separator />
              {!allResolved && (
                <p className="text-xs text-amber-600">
                  Resolve every flagged row above before importing.
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose} className="w-full">Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleConfirm}
                disabled={!data || !allResolved || !hasAnyWork || commit.isPending}
              >
                {commit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Confirm & Import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
