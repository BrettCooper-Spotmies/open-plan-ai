import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Pencil, Trash2, FileText, Download, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, differenceInHours } from 'date-fns';
import { ChatMessage } from '../types';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: ChatMessage;
  showSenderInfo: boolean;
  showTimestamp: boolean;
  isGroupChat: boolean;
  currentUserId?: string;
  searchQuery?: string;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string, senderName: string) => void;
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

function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300/60 dark:bg-yellow-500/40 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
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

export function MessageBubble({
  message, showSenderInfo, showTimestamp, isGroupChat, currentUserId,
  searchQuery, onEdit, onDelete,
}: MessageBubbleProps) {
  const isOwn = message.senderId === currentUserId;
  const isFile = message.contentType === 'file';
  const fileData = isFile ? parseFileContent(message.content) : null;
  const isDeleted = !!message.deletedAt;
  const isWithin24h = differenceInHours(new Date(), new Date(message.createdAt)) < 24;
  const canModify = isOwn && isWithin24h && !isDeleted;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) editRef.current?.focus();
  }, [isEditing]);

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    onEdit?.(message.id, trimmed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message? It will show as deleted to everyone.')) {
      onDelete?.(message.id, message.senderName);
    }
  };

  // Deleted message display
  if (isDeleted) {
    return (
      <div className={cn('flex gap-2 px-4', isOwn ? 'flex-row-reverse' : 'flex-row')}>
        {isGroupChat && <div className="w-8 shrink-0" />}
        <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
          <div className="rounded-2xl px-3 py-2 text-sm italic text-muted-foreground bg-muted/50 border border-dashed border-border">
            🚫 This message was deleted by {message.deletedByName || message.senderName}
          </div>
          {showTimestamp && (
            <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
          )}
        </div>
      </div>
    );
  }

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
            {canModify && !isFile && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {canModify && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={handleDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-1 min-w-[200px]">
              <Textarea
                ref={editRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" className="h-6 text-xs" onClick={handleSaveEdit}>
                  <Check className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
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
                <HighlightedText text={message.content} query={searchQuery} />
              )}
            </div>
          )}
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
