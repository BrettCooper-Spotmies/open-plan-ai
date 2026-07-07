import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Pencil, Trash2, FileText, Download, Check, X, CheckCheck, MoreHorizontal, SmilePlus, Clock, Loader2, Reply, ZoomIn, ExternalLink, FileImage, File as FileIcon2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { differenceInHours } from 'date-fns';
import { ChatMessage, ReadReceipt, MessageReaction, ChatEntityType, EntityTagRef } from '../types';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { chatService } from '@/services/chat.service';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatMessageTimestamp } from '@/utils/dateTime';
import EntityTagChip from './EntityTagChip';

const ENTITY_TAG_ROUTE: Record<ChatEntityType, (tag: EntityTagRef) => string> = {
  task: (tag) => `/projects/${tag.projectId}/tasks/${tag.entityId}`,
  issue: (tag) => `/projects/${tag.projectId}/issues/${tag.entityId}`,
  milestone: (tag) => `/projects/${tag.projectId}/milestones/${tag.entityId}`,
  hardware_module: (tag) => `/projects/${tag.projectId}/modules/${tag.entityId}`,
  bom_node: (tag) => `/projects/${tag.projectId}/bom/${tag.entityId}`,
  eco: (tag) => `/projects/${tag.projectId}/eng-changes/${tag.entityId}`,
};

const EMOJI_SET = ['👍', '❤️', '😂', '😮', '🔥', '💯'];
const EXTENDED_EMOJI_SET = [
  '👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '💯',
  '🎉', '🤔', '👀', '🙏', '💪', '✨', '🫡', '😍',
  '🥳', '😎', '🤣', '😅', '😡', '💔', '👎', '🤝',
];

interface MessageBubbleProps {
  message: ChatMessage;
  showSenderInfo: boolean;
  showTimestamp: boolean;
  isGroupChat: boolean;
  currentUserId?: string;
  searchQuery?: string;
  memberNames?: string[];
  readReceipts?: ReadReceipt[];
  reactions?: MessageReaction[];
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string, senderName: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void | Promise<void>;
  onReply?: (message: ChatMessage) => void;
}

interface FileContent {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath?: string;
  url?: string;
  text?: string;
}

function parseFileContent(content: string): FileContent | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.fileName && (parsed.storagePath || parsed.url)) return parsed;
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

function ExpandableText({ text, query, isOwn = false, memberNames }: { text: string; query?: string; isOwn?: boolean; memberNames?: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLong = text.length > 300 || (text.match(/\n/g) || []).length > 5;

  const displayText = isLong && !isExpanded
    ? text.substring(0, 300) + (text.length > 300 ? '...' : '')
    : text;

  const renderText = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        <MentionHighlightedText text={line} query={query} isOwn={isOwn} memberNames={memberNames} />
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="flex flex-col">
      <div className={cn('whitespace-pre-wrap', isLong && !isExpanded && 'line-clamp-6')}>
        {renderText(displayText)}
      </div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs opacity-80 hover:opacity-100 font-medium mt-1 self-start underline underline-offset-2"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

function MentionHighlightedText({ text, query, isOwn = false, memberNames }: { text: string; query?: string; isOwn?: boolean; memberNames?: string[] }) {
  const parts: { text: string; isMention: boolean }[] = [];

  if (memberNames && memberNames.length > 0) {
    // Sort by length descending so longer names are matched first (e.g. "Jagan Tripuragiri" before "Jagan")
    const sorted = [...memberNames].sort((a, b) => b.length - a.length);
    const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const mentionRegex = new RegExp(`(@(?:${escaped.join('|')}))(?=\\s|$|[.,!?])`, 'g');
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isMention: false });
      }
      parts.push({ text: match[1], isMention: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isMention: false });
    }
  } else {
    // Fallback: match @Word or @Word Word (up to two words) when no member list available
    const mentionRegex = /(@\w+(?:\s\w+)?)(?=\s|$|[.,!?])/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isMention: false });
      }
      parts.push({ text: match[1], isMention: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isMention: false });
    }
  }

  if (parts.length === 0) parts.push({ text, isMention: false });

  return (
    <>
      {parts.map((part, i) =>
        part.isMention ? (
          <span
            key={i}
            className={cn(
              'font-medium rounded px-0.5',
              isOwn
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-primary/20 text-primary'
            )}
          >
            <HighlightedText text={part.text} query={query} />
          </span>
        ) : (
          <HighlightedText key={i} text={part.text} query={query} />
        )
      )}
    </>
  );
}

function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300/60 dark:bg-yellow-500/40 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFileType(mimeType: string, fileName: string): 'image' | 'pdf' | 'doc' | 'other' {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (
    mimeType?.includes('word') ||
    mimeType?.includes('document') ||
    /\.(docx?|odt)$/i.test(fileName ?? '')
  ) return 'doc';
  return 'other';
}

function getFileIcon(type: 'image' | 'pdf' | 'doc' | 'other') {
  if (type === 'image') return FileImage;
  if (type === 'pdf' || type === 'doc') return FileText;
  return FileIcon2;
}

// ─── Image Lightbox ──────────────────────────────────────────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90 border-none flex items-center justify-center overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain rounded"
          onClick={(e) => e.stopPropagation()}
        />
        <a
          href={src}
          download={alt}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-50 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/80 transition-colors"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </a>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main FileAttachment component ──────────────────────────────────────────

function FileAttachment({ file, isOwn }: { file: FileContent; isOwn: boolean }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const url = file.url ?? '';
  const fileType = getFileType(file.mimeType ?? '', file.fileName ?? '');
  const Icon = getFileIcon(fileType);

  const handleClick = useCallback(() => {
    if (!url) return;
    if (fileType === 'image') {
      setLightboxOpen(true);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url, fileType]);

  if (fileType === 'image') {
    return (
      <>
        <div
          className="group relative cursor-pointer rounded-xl overflow-hidden"
          style={{ maxWidth: 280 }}
          onClick={handleClick}
          title="Click to view"
        >
          <img
            src={url}
            alt={file.fileName}
            className="w-full max-h-[220px] object-cover rounded-xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
        {file.text && <p className="text-sm mt-1">{file.text}</p>}
        {lightboxOpen && url && (
          <ImageLightbox src={url} alt={file.fileName} onClose={() => setLightboxOpen(false)} />
        )}
      </>
    );
  }

  // PDF / DOC / other file card
  const isPreviewable = fileType === 'pdf' || fileType === 'doc';
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!url}
      className={cn(
        'flex w-full items-center gap-3 p-3 rounded-xl border text-left transition-all',
        'hover:bg-accent/60 active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isOwn ? 'border-primary-foreground/20 bg-primary-foreground/5' : 'border-border bg-muted/30'
      )}
      title={isPreviewable ? `Open ${fileType.toUpperCase()} preview` : 'Open file'}
    >
      <div className={cn(
        'h-10 w-10 shrink-0 rounded-lg flex items-center justify-center',
        fileType === 'pdf' ? 'bg-red-500/15 text-red-500' :
        fileType === 'doc' ? 'bg-blue-500/15 text-blue-500' :
        'bg-muted text-muted-foreground'
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{file.fileName}</p>
        <p className="text-xs opacity-60 mt-0.5">
          {file.fileSize ? formatFileSize(file.fileSize) : ''}
          {file.fileSize && fileType !== 'other' ? ' · ' : ''}
          {fileType === 'pdf' ? 'PDF' : fileType === 'doc' ? 'Document' : ''}
        </p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 opacity-50" />
    </button>
  );
}

export function MessageBubble({
  message, showSenderInfo, showTimestamp, isGroupChat, currentUserId,
  searchQuery, memberNames, readReceipts, reactions, onEdit, onDelete, onToggleReaction, onReply,
}: MessageBubbleProps) {
  const timezone = useUserTimezone();
  const navigate = useNavigate();
  const isOwn = message.senderId === currentUserId;
  const isFile = message.contentType === 'file' || message.contentType === 'image' || (message.attachments?.length ?? 0) > 0;

  // Build fileData from new attachments[] array OR legacy JSON content
  const fileData: FileContent | null = (() => {
    // New format: attachments array from backend
    if (message.attachments?.length) {
      const a = message.attachments[0] as any;
      return {
        fileName: a.name ?? a.fileName ?? '',
        fileSize: a.size ?? a.fileSize ?? 0,
        mimeType: a.mimeType ?? a.type ?? '',
        url: a.url ?? '',
        text: message.contentType !== 'image' && message.contentType !== 'file' ? message.content : undefined,
      };
    }
    // Legacy format: JSON encoded in content
    if (message.contentType === 'file' || message.contentType === 'image') {
      const parsed = parseFileContent(message.content);
      if (parsed) return parsed;
    }
    return null;
  })();
  const isDeleted = !!message.deletedAt;
  const isWithin24h = differenceInHours(new Date(), new Date(message.createdAt)) < 24;
  const canModify = isOwn && isWithin24h && !isDeleted;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // State-based hover + popover/dropdown management
  const [isHovered, setIsHovered] = useState(false);
  const [isMoreEmojiOpen, setIsMoreEmojiOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Toolbar stays visible while hovered OR any popover/dropdown is open
  const showToolbar = isHovered || isMoreEmojiOpen || isMenuOpen;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

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
    onDelete?.(message.id, message.senderName);
    setShowDeleteConfirm(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Copied to clipboard');
  };

  const handleEmojiClick = (emoji: string) => {
    onToggleReaction?.(message.id, emoji);
  };

  const handleMoreEmojiClick = (emoji: string) => {
    onToggleReaction?.(message.id, emoji);
    setIsMoreEmojiOpen(false);
  };

  // When modifying a reaction via the pill picker, rely on backend replace logic
  const handleReactionReplace = async (emoji: string) => {
    onToggleReaction?.(message.id, emoji);
    setIsReactionPickerOpen(false);
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
              {formatMessageTimestamp(message.createdAt, timezone)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2 px-4', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {isGroupChat && (
        <div className="w-8 shrink-0">
          {showSenderInfo && !isOwn && (
            <Avatar className="h-8 w-8">
              {message.senderAvatar && (
                <AvatarImage src={message.senderAvatar} alt={message.senderName} className="object-cover" />
              )}
              <AvatarFallback className="text-[10px]">{message.senderInitials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {showSenderInfo && !isOwn && isGroupChat && (
          <span className="text-xs text-muted-foreground font-medium mb-0.5 px-1">{message.senderName}</span>
        )}

        {/* Hover toolbar: emojis + more + 3-dot menu */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={cn(
              'absolute z-10 top-0 rounded-lg border border-border bg-popover shadow-md px-1 py-0.5 flex items-center gap-0.5 transition-opacity',
              isOwn ? 'right-full mr-2' : 'left-full ml-2',
              showToolbar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Quick emoji reactions */}
            {EMOJI_SET.map((emoji) => (
              <button
                key={emoji}
                className="text-base hover:bg-muted rounded p-1 transition-colors cursor-pointer leading-none"
                title={emoji}
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}



            {/* More emojis button */}
            <Popover open={isMoreEmojiOpen} onOpenChange={setIsMoreEmojiOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" title="More reactions">
                  <SmilePlus className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top" align="center">
                <div className="grid grid-cols-8 gap-1">
                  {EXTENDED_EMOJI_SET.map((emoji) => (
                    <button
                      key={emoji}
                      className="text-lg hover:bg-muted rounded p-1 transition-colors cursor-pointer leading-none"
                      onClick={() => handleMoreEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-0.5" />

            {/* 3-dot menu */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" title="More options">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align={isOwn ? 'end' : 'start'} className="min-w-[140px]">
                <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                {!isDeleted && (
                  <DropdownMenuItem onClick={() => onReply?.(message)} className="cursor-pointer">
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {canModify && !isFile && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  </>
                )}
                {canModify && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="cursor-pointer text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Message bubble content */}
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
                'rounded-2xl px-3 py-2 text-sm leading-relaxed max-w-full overflow-hidden',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md border border-primary/20'
                  : 'bg-muted text-foreground rounded-bl-md border border-border'
              )}
            >
              {message.replyToMessage && (
                <div
                  className={cn(
                    'mb-2 rounded-md border-l-2 px-2 py-1 text-xs',
                    isOwn
                      ? 'border-primary-foreground/50 bg-primary-foreground/10'
                      : 'border-primary/40 bg-primary/10'
                  )}
                >
                  <div className="font-medium opacity-90">{message.replyToMessage.senderName}</div>
                  <div className="opacity-80 truncate">
                    {message.replyToMessage.deletedAt
                      ? 'Message deleted'
                      : message.replyToMessage.contentType === 'file'
                        ? 'Attachment'
                        : message.replyToMessage.content}
                  </div>
                </div>
              )}
              {isFile && fileData ? (
                <FileAttachment file={fileData} isOwn={isOwn} />
              ) : (
                <ExpandableText text={message.content} query={searchQuery} isOwn={isOwn} memberNames={memberNames} />
              )}
              {message.entityTags && message.entityTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.entityTags.map((tag, i) => (
                    <EntityTagChip
                      key={`${tag.entityType}-${tag.entityId}-${i}`}
                      tag={tag}
                      variant="sent"
                      isOwn={isOwn}
                      onClick={() => navigate(ENTITY_TAG_ROUTE[tag.entityType](tag))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reaction pills — clicking opens picker to modify reaction */}
        {reactions && reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1 px-1', isOwn ? 'justify-end' : 'justify-start')}>
            <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
              <PopoverTrigger asChild>
                <div className="flex flex-wrap gap-1 cursor-pointer">
                  {reactions.map((r) => (
                    <span
                      key={r.emoji}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors',
                        r.reactedByMe
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.count}</span>
                    </span>
                  ))}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top" align="center">
                <div className="flex gap-1">
                  {EMOJI_SET.map((emoji) => (
                    <button
                      key={emoji}
                      className={cn(
                        'text-lg rounded p-1 transition-colors cursor-pointer',
                        reactions?.some((r) => r.emoji === emoji && r.reactedByMe)
                          ? 'bg-primary/20 ring-1 ring-primary'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => handleReactionReplace(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {showTimestamp && (
          <span className="text-[10px] text-muted-foreground mt-0.5 px-1 flex items-center gap-1">
            {formatMessageTimestamp(message.createdAt, timezone)}
            {message.isEdited && ' (edited)'}
            {isOwn && (() => {
              const otherReads = (readReceipts ?? []).filter(
                (r) => r.userId !== currentUserId
              );
              if (otherReads.length > 0) {
                return (
                  <CheckCheck className="h-3 w-3 text-primary" aria-label="Read" />
                );
              }
              if (message.status === 'pending') {
                return (
                  <Clock className="h-3 w-3 text-muted-foreground" aria-label="Pending" />
                );
              }
              if (message.isOptimistic || message.status === 'sending') {
                return (
                  <Check className="h-3 w-3 text-muted-foreground" aria-label="Sending" />
                );
              }
              return (
                <CheckCheck className="h-3 w-3 text-muted-foreground" aria-label="Sent" />
              );
            })()}
          </span>
        )}
        {!showTimestamp && isOwn && (
          <span className="text-[10px] mt-0.5 px-1 flex items-center justify-end">
            {(() => {
              const otherReads = (readReceipts ?? []).filter(
                (r) => r.userId !== currentUserId
              );
              if (otherReads.length > 0) {
                return (
                  <CheckCheck className="h-3 w-3 text-primary" aria-label="Read" />
                );
              }
              if (message.status === 'pending') {
                return (
                  <Clock className="h-3 w-3 text-muted-foreground" aria-label="Pending" />
                );
              }
              if (message.isOptimistic || message.status === 'sending') {
                return (
                  <Check className="h-3 w-3 text-muted-foreground" aria-label="Sending" />
                );
              }
              return (
                <CheckCheck className="h-3 w-3 text-muted-foreground" aria-label="Sent" />
              );
            })()}
          </span>
        )}
      </div>
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Message"
        description="Are you sure you want to delete this message? It will show as deleted to everyone in the chat."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
