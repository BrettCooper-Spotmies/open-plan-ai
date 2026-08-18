/**
 * BOMGoogleSheetsLinkDialog — pick which spreadsheet/tab mirrors this
 * project's BOM. Google account connection happens once per org from the
 * Integrations page (like Drive/Meet) — this dialog only ever links a sheet
 * using that existing connection; it has no OAuth step of its own. Callers
 * should only render/open it once `linkStatus.orgConnected` is true.
 * See GOOGLE_SHEETS_BOM_INTEGRATION.md Step 2.
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Sheet as SheetIcon, ExternalLink, Unlink } from 'lucide-react';
import type { GoogleSheetsLinkStatus, SheetTab } from '@/services/googleSheets.service';
import {
  usePreviewGoogleSheetTabs,
  useLinkGoogleSheet,
  useUnlinkGoogleSheet,
} from '@/hooks/useGoogleSheets';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  linkStatus: GoogleSheetsLinkStatus | undefined;
}

export default function BOMGoogleSheetsLinkDialog({ open, onClose, projectId, linkStatus }: Props) {
  const [url, setUrl] = useState('');
  const [tabs, setTabs] = useState<SheetTab[] | null>(null);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('');

  const previewTabs = usePreviewGoogleSheetTabs(projectId);
  const linkSheet = useLinkGoogleSheet(projectId);
  const unlinkSheet = useUnlinkGoogleSheet(projectId);

  const isLinked = !!linkStatus?.linked;

  const resetLinkForm = () => {
    setUrl('');
    setTabs(null);
    setSpreadsheetTitle('');
    setSelectedTab('');
  };

  const handleClose = () => {
    resetLinkForm();
    onClose();
  };

  const handleFindTabs = async () => {
    if (!url.trim()) return;
    const result = await previewTabs.mutateAsync(url.trim());
    setTabs(result.tabs);
    setSpreadsheetTitle(result.spreadsheetTitle);
    setSelectedTab(result.tabs[0]?.title ?? '');
  };

  const handleLink = async () => {
    if (!selectedTab) return;
    await linkSheet.mutateAsync({ spreadsheetUrl: url.trim(), sheetTabName: selectedTab });
    handleClose();
  };

  const handleUnlink = async () => {
    await unlinkSheet.mutateAsync();
    resetLinkForm();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SheetIcon className="h-5 w-5 text-emerald-600" />
            Google Sheets
          </DialogTitle>
          <DialogDescription>
            Link a Google Sheet to sync with this project's BOM. Nothing syncs automatically —
            you'll always review changes before Pull or Push writes anything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {linkStatus?.email && (
            <p className="text-xs text-muted-foreground">Connected as {linkStatus.email}</p>
          )}

          {isLinked && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="font-medium text-foreground">Currently linked</div>
              <div className="text-muted-foreground truncate">
                Sheet ID {linkStatus?.spreadsheetId} — tab "{linkStatus?.sheetTabName}"
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${linkStatus?.spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
              >
                Open in Google Sheets <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="gs-url">{isLinked ? 'Link a different sheet' : 'Google Sheets link'}</Label>
            <div className="flex gap-2">
              <Input
                id="gs-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleFindTabs}
                disabled={!url.trim() || previewTabs.isPending}
              >
                {previewTabs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find tabs'}
              </Button>
            </div>
          </div>

          {tabs && (
            <div className="space-y-2">
              <Label>Which tab is your BOM? — "{spreadsheetTitle}"</Label>
              <RadioGroup value={selectedTab} onValueChange={setSelectedTab} className="max-h-40 overflow-y-auto">
                {tabs.map((tab) => (
                  <div key={tab.sheetId} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <RadioGroupItem value={tab.title} id={`tab-${tab.sheetId}`} />
                    <Label htmlFor={`tab-${tab.sheetId}`} className="cursor-pointer font-normal">
                      {tab.title}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button onClick={handleLink} disabled={!selectedTab || linkSheet.isPending} className="w-full">
                {linkSheet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Link this sheet'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {isLinked ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleUnlink}
              disabled={unlinkSheet.isPending}
            >
              <Unlink className="h-3.5 w-3.5 mr-1.5" />
              Unlink
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
