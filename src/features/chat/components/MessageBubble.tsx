import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Pencil, Trash2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ChatMessage } from '../types';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: ChatMessage;
  showSenderInfo: boolean;
  showTimestamp: boolean;
  isGroupChat: boolean;
  currentUserId?: string;
}

interface FileContent {
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  text?: string;
}

function parseFileContent(content: string): FileContent | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.url && parsed.fileName) return parsed;
    return null;
  } catch {
    return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function FileAttachment({ file, isOwn }: { file: FileContent; isOwn: boolean }) {
  const isImage = file.mimeType?.startsWith('image/');

  if (isImage) {
    return (
      <div className="space-y-1">
        <a href={file.url} target="_blank" rel="noopener noreferrer">
          <img
            src={file.url}
            alt={file.fileName}
            className="max-w-[280px] max-h-[200px] rounded-lg object-cover cursor-pointer"
          />
        </a>
        {file.text && <p className="text-sm">{file.text}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border',
          isOwn ? 'border-primary-foreground/20' : 'border-border'
        )}
      >
        <FileText className="h-8 w-8 shrink-0 opacity-70" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{file.fileName}</p>
          <p className="text-xs opacity-70">{formatFileSize(file.fileSize)}</p>
        </div>
        <Download className="h-4 w-4 shrink-0 opacity-70" />
      </a>
      {file.text && <p className="text-sm">{file.text}</p>}
    </div>
  );
}

export function MessageBubble({ message, showSenderInfo, showTimestamp, isGroupChat, currentUserId }: MessageBubbleProps) {
  const isOwn = message.senderId === currentUserId;
  const isFile = message.contentType === 'file';
  const fileData = isFile ? parseFileContent(message.content) : null;

  return (
    <div className={cn('flex gap-2 px-4 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {isGroupChat && (
        <div className="w-8 shrink-0">
          {showSenderInfo && !isOwn && (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px]">{message.senderInitials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {showSenderInfo && !isOwn && isGroupChat && (
          <span className="text-xs text-muted-foreground font-medium mb-0.5 px-1">{message.senderName}</span>
        )}

        <div className="relative flex items-center gap-1">
          <div className={cn(
            'hidden group-hover:flex items-center gap-0.5 absolute top-0',
            isOwn ? 'right-full mr-1' : 'left-full ml-1'
          )}>
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => { navigator.clipboard.writeText(message.content); toast.success('Copied'); }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            {isOwn && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </>
            )}
          </div>

          <div
            className={cn(
              'rounded-2xl px-3 py-2 text-sm leading-relaxed',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}
          >
            {isFile && fileData ? (
              <FileAttachment file={fileData} isOwn={isOwn} />
            ) : (
              message.content
            )}
          </div>
        </div>

        {showTimestamp && (
          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
            {format(new Date(message.createdAt), 'h:mm a')}
            {message.isEdited && ' (edited)'}
          </span>
        )}
      </div>
    </div>
  );
}
