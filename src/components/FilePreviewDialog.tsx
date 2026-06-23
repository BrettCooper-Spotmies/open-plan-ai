import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, File as FileIcon, ExternalLink } from 'lucide-react';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'];

function extOf(fileName: string, url: string): string {
  return (fileName || url).split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
}

function kindOf(fileName: string, url: string, mimeType?: string | null): 'image' | 'pdf' | 'other' {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  const ext = extOf(fileName, url);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

export interface FilePreviewTarget {
  url: string;
  fileName: string;
  mimeType?: string | null;
}

export function FilePreviewDialog({
  file,
  onClose,
}: {
  file: FilePreviewTarget | null;
  onClose: () => void;
}) {
  if (!file) return null;
  const kind = kindOf(file.fileName, file.url, file.mimeType);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          kind === 'other'
            ? 'max-w-md'
            : 'max-w-[90vw] max-h-[90vh] w-full h-full sm:w-[90vw] sm:h-[90vh] p-0 flex flex-col overflow-hidden'
        }
      >
        {kind === 'other' ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <DialogTitle className="sr-only">{file.fileName}</DialogTitle>
            <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground text-center break-all">{file.fileName}</p>
            <p className="text-xs text-muted-foreground">No inline preview available for this file type.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open in new tab
                </a>
              </Button>
              <Button size="sm" asChild>
                <a href={file.url} download={file.fileName}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <DialogTitle className="text-sm font-medium text-foreground truncate pr-4">
                {file.fileName}
              </DialogTitle>
              <a
                href={file.url}
                download={file.fileName}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
            <div className="flex-1 min-h-0 bg-muted/30 flex items-center justify-center overflow-auto">
              {kind === 'image' ? (
                <img src={file.url} alt={file.fileName} className="max-w-full max-h-full object-contain" />
              ) : (
                <iframe src={file.url} title={file.fileName} className="w-full h-full border-0" />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
