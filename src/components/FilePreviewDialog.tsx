import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, File as FileIcon, ExternalLink, ChevronLeft, ChevronRight, X, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v'];

function extOf(fileName: string, url: string): string {
  return (fileName || url).split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
  return null;
}

export function getVideoThumbnail(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

export function isVideoUrl(url: string): boolean {
  if (getYouTubeId(url) || getVimeoId(url)) return true;
  const ext = extOf('', url);
  return VIDEO_EXTENSIONS.includes(ext);
}

function kindOf(fileName: string, url: string, mimeType?: string | null): 'image' | 'pdf' | 'video' | 'embed' | 'other' {
  // Check for embed URLs first (YouTube, Vimeo) before generic video/* check
  if (getEmbedUrl(url)) return 'embed';
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType?.startsWith('video/')) return 'video';
  const ext = extOf(fileName, url);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'other';
}

export interface FilePreviewTarget {
  url: string;
  fileName: string;
  mimeType?: string | null;
}

export function FilePreviewDialog({
  file,
  files,
  initialIndex,
  onClose,
}: {
  file: FilePreviewTarget | null;
  files?: FilePreviewTarget[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const list = file && files && files.length > 1 ? files : null;

  const startIdx = (() => {
    if (initialIndex !== undefined && list) return initialIndex;
    if (file && list) {
      const idx = list.findIndex(f => f.url === file.url);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  })();

  const [currentIdx, setCurrentIdx] = useState(startIdx);

  useEffect(() => {
    setCurrentIdx(startIdx);
  }, [startIdx]);

  const current = list ? list[currentIdx] : file;

  const goPrev = useCallback(() => {
    if (!list) return;
    setCurrentIdx(i => (i - 1 + list.length) % list.length);
  }, [list]);

  const goNext = useCallback(() => {
    if (!list) return;
    setCurrentIdx(i => (i + 1) % list.length);
  }, [list]);

  useEffect(() => {
    if (!list) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [list, goPrev, goNext]);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!current) return;
    const kind = kindOf(current.fileName, current.url, current.mimeType);
    if (kind !== 'pdf') return;

    setBlobUrl(null);
    setBlobLoading(true);
    let cancelled = false;

    fetch(current.url, { credentials: 'include' })
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      })
      .finally(() => {
        if (!cancelled) setBlobLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [current?.url]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  if (!current) return null;
  const kind = kindOf(current.fileName, current.url, current.mimeType);
  const isMedia = kind === 'image' || kind === 'pdf' || kind === 'video' || kind === 'embed';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          !isMedia
            ? 'max-w-md'
            : 'max-w-[90vw] max-h-[90vh] w-full h-full sm:w-[90vw] sm:h-[90vh] p-0 flex flex-col overflow-hidden [&>button]:hidden'
        }
      >
        {!isMedia ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <DialogTitle className="sr-only">{current.fileName}</DialogTitle>
            <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground text-center break-all">{current.fileName}</p>
            <p className="text-xs text-muted-foreground">No inline preview available for this file type.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={current.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open in new tab
                </a>
              </Button>
              <Button size="sm" asChild>
                <a href={current.url} download={current.fileName}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <DialogTitle className="text-sm font-medium text-foreground truncate pr-4 flex items-center gap-2">
                {(kind === 'video' || kind === 'embed') && <Video className="w-4 h-4 shrink-0 text-muted-foreground" />}
                {current.fileName}
              </DialogTitle>
              <div className="flex items-center gap-3 shrink-0">
                {list && (
                  <span className="text-xs text-muted-foreground">
                    {currentIdx + 1} / {list.length}
                  </span>
                )}
                {kind !== 'embed' && (
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Download"
                    onClick={async () => {
                      try {
                        const res = await fetch(current.url);
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = current.fileName;
                        a.click();
                        URL.revokeObjectURL(blobUrl);
                      } catch {
                        window.open(current.url, '_blank');
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                {kind === 'embed' && (
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {kind === 'image' && (
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy image to clipboard"
                    onClick={async () => {
                      try {
                        const res = await fetch(current.url);
                        const blob = await res.blob();
                        const bitmap = await createImageBitmap(blob);
                        const canvas = document.createElement('canvas');
                        canvas.width = bitmap.width;
                        canvas.height = bitmap.height;
                        canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
                        const pngBlob = await new Promise<Blob>((resolve, reject) =>
                          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
                        );
                        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
                        toast.success('Image copied to clipboard');
                      } catch {
                        toast.error('Failed to copy');
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0 bg-muted/30 flex items-center justify-center overflow-auto">
              {list && (
                <button
                  onClick={goPrev}
                  className="absolute left-2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background/80 border border-border shadow hover:bg-background transition-colors"
                  aria-label="Previous file"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {kind === 'image' ? (
                <img src={current.url} alt={current.fileName} className="max-w-full max-h-full object-contain" />
              ) : kind === 'video' ? (
                <video
                  src={current.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full"
                  style={{ maxHeight: 'calc(90vh - 56px)' }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : kind === 'embed' ? (
                <iframe
                  src={getEmbedUrl(current.url) ?? current.url}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={current.fileName}
                />
              ) : blobLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : blobUrl ? (
                <object data={blobUrl} type="application/pdf" className="w-full h-full border-0">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileIcon className="w-10 h-10" />
                    <p className="text-sm">Unable to preview this PDF.</p>
                    <Button variant="outline" size="sm" asChild>
                      <a href={current.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Open in new tab
                      </a>
                    </Button>
                  </div>
                </object>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <FileIcon className="w-10 h-10" />
                  <p className="text-sm">Unable to preview this file.</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={current.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Open in new tab
                    </a>
                  </Button>
                </div>
              )}
              {list && (
                <button
                  onClick={goNext}
                  className="absolute right-2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background/80 border border-border shadow hover:bg-background transition-colors"
                  aria-label="Next file"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
