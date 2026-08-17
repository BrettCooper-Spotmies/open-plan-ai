/**
 * BOMGoogleSheetsPushDialog — Push (Export) preview/confirm. Implements the
 * three explicit questions from GOOGLE_SHEETS_BOM_INTEGRATION.md §1/Step 4,
 * each an independent toggle that defaults OFF (nothing is written unless
 * the user explicitly opts in) — "none default" per the plan. New rows
 * always write regardless of the toggles; only overwriting sheet data
 * already present is gated.
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowUpFromLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGoogleSheetsExportPreview, useGoogleSheetsExportCommit } from '@/hooks/useGoogleSheets';
import type { ExportCommitResult } from '@/services/googleSheets.service';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export default function BOMGoogleSheetsPushDialog({ open, onClose, projectId }: Props) {
  const preview = useGoogleSheetsExportPreview(projectId);
  const commit = useGoogleSheetsExportCommit(projectId);

  const [addNewFields, setAddNewFields] = useState(false);
  const [updateChangedColumns, setUpdateChangedColumns] = useState(false);
  const [renameHeaders, setRenameHeaders] = useState(false);
  const [result, setResult] = useState<ExportCommitResult | null>(null);

  useEffect(() => {
    if (open) {
      setAddNewFields(false);
      setUpdateChangedColumns(false);
      setRenameHeaders(false);
      setResult(null);
      preview.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const data = preview.data;
  const isFirstExport = !!data?.isFirstExport;
  const nothingToDo =
    data && !isFirstExport &&
    data.newFields.length === 0 &&
    data.renamedHeaders.length === 0 &&
    data.newPartRows.length === 0 &&
    data.changedRows.length === 0;

  const handleConfirm = async () => {
    const res = await commit.mutateAsync({ addNewFields, updateChangedColumns, renameHeaders });
    setResult(res);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-emerald-600" />
            Push to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Latest revision only — nothing writes until you confirm.
          </DialogDescription>
        </DialogHeader>

        {preview.isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Comparing your BOM against the sheet...
          </div>
        )}

        {preview.isError && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-destructive">
            <AlertCircle className="h-5 w-5" />
            Couldn't load the Push preview.
            <Button variant="outline" size="sm" onClick={() => preview.mutate()}>Retry</Button>
          </div>
        )}

        {result && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Push complete</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>{result.newRowsWritten} new row(s) written</li>
              {result.newFieldsAdded > 0 && <li>{result.newFieldsAdded} new field(s) added</li>}
              {result.columnsUpdated > 0 && <li>{result.columnsUpdated} row(s) updated</li>}
              {result.headersRenamed > 0 && <li>{result.headersRenamed} header(s) renamed</li>}
              <li>{result.totalRowsWritten} total row(s) in the sheet</li>
            </ul>
          </div>
        )}

        {data && !result && (
          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-5 py-2">
              {isFirstExport ? (
                <p className="text-sm text-muted-foreground">
                  This sheet has no BOM data yet — Push will write all {data.totalRows} part(s) as a fresh export.
                </p>
              ) : nothingToDo ? (
                <p className="text-sm text-muted-foreground">
                  Nothing to push — your sheet already matches the latest revision of every part.
                </p>
              ) : (
                <>
                  {data.newPartRows.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {data.newPartRows.length} part(s) aren't in the sheet yet and will be added as new rows.
                    </p>
                  )}

                  {data.newFields.length > 0 && (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Some new fields have been added to our BOM.</p>
                          <p className="text-xs text-muted-foreground">Would you like to add these fields to Google Sheets too?</p>
                        </div>
                        <Switch checked={addNewFields} onCheckedChange={setAddNewFields} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.newFields.map((f) => (
                          <Badge key={f} variant="secondary" className="text-[11px]">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.changedRows.length > 0 && (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {data.changedRows.length} part(s) have values that differ from the sheet.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Would you like to update these columns in Google Sheets, or leave them as-is?
                          </p>
                        </div>
                        <Switch checked={updateChangedColumns} onCheckedChange={setUpdateChangedColumns} />
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1.5">
                        {data.changedRows.map((row) => (
                          <div key={row.partNumber} className="text-xs">
                            <span className="font-medium text-foreground">{row.partNumber}</span>{' '}
                            <span className="text-muted-foreground">
                              — {row.changes.map((c) => c.field).join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.renamedHeaders.length > 0 && (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Column names in Google Sheets are different from our BOM's column names.</p>
                          <p className="text-xs text-muted-foreground">Would you like to rename them in Google Sheets to match our BOM?</p>
                        </div>
                        <Switch checked={renameHeaders} onCheckedChange={setRenameHeaders} />
                      </div>
                      <div className="space-y-1">
                        {data.renamedHeaders.map((r) => (
                          <div key={r.canonicalLabel} className="text-xs text-muted-foreground">
                            "{r.oldHeader}" → "{r.newHeader}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.unchangedCount > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground">
                        {data.unchangedCount} part(s) already match the sheet — no change needed.
                      </p>
                    </>
                  )}
                </>
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
                disabled={!data || commit.isPending || (nothingToDo && !isFirstExport)}
              >
                {commit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Confirm & Write
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
