import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Pencil, Trash2, FileText, Download, Check, X, CheckCheck, MoreHorizontal, SmilePlus, Clock, Loader2, Reply } from 'lucide-react';
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
import { format, differenceInHours } from 'date-fns';
import { ChatMessage, ReadReceipt, MessageReaction } from '../types';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { chatService } from '@/services/chat.service';

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

function ExpandableText({ text, query }: { text: string; query?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLong = text.length > 300 || (text.match(/\n/g) || []).length > 5;

  const displayText = isLong && !isExpanded
    ? text.substring(0, 300) + (text.length > 300 ? '...' : '')
    : text;

  const renderText = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        <MentionHighlightedText text={line} query={query} />
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

function MentionHighlightedText({ text, query }: { text: string; query?: string }) {
  // Split on @mentions first, then apply search highlighting
  const mentionRegex = /(@\w[\w\s]*?\w)(?=\s|$|[.,!?])/g;
  const parts: { text: string; isMention: boolean }[] = [];
  let lastIndex = 0;
  let match;

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
  if (parts.length === 0) parts.push({ text, isMention: false });

  return (
    <>
      {parts.map((part, i) =>
        part.isMention ? (
          <span key={i} className="bg-primary/20 text-primary font-medium rounded px-0.5">
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(file.url || null);
  const isImage = file.mimeType?.startsWith('image/');

  useEffect(() => {
    let isMounted = true;

    if (!isImage) return;
    if (file.url) {
      setImageUrl(file.url);
      return;
    }
    if (!file.storagePath) {
      setImageUrl(null);
      return;
    }

    chatService
      .getChatAttachmentDownloadUrl({
        storagePath: file.storagePath,
        fileName: file.fileName,
      })
      .then((signedUrl) => {
        if (isMounted) setImageUrl(signedUrl);
      })
      .catch(() => {
        if (isMounted) setImageUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isImage, file.url, file.storagePath, file.fileName]);

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      await chatService.downloadChatAttachment({
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        storagePath: file.storagePath,
        url: file.url,
      });
      toast.success(`Downloading ${file.fileName}`);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isImage) {
    return (
      <div className="space-y-1">
        <div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={file.fileName}
              className="max-w-[280px] max-h-[200px] rounded-lg object-cover"
            />
          ) : (
            <div className="w-[220px] h-[120px] rounded-lg bg-muted/50 flex items-center justify-center">
              <FileText className="h-6 w-6 opacity-60" />
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
          Download
        </Button>
        {file.text && <p className="text-sm">{file.text}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className={cn(
          'flex w-full items-center gap-2 p-2 rounded-lg border text-left transition-colors',
          'disabled:opacity-70 disabled:cursor-not-allowed',
          isOwn ? 'border-primary-foreground/20' : 'border-border'
        )}
      >
        <FileText className="h-8 w-8 shrink-0 opacity-70" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-all whitespace-normal">{file.fileName}</p>
          <p className="text-xs opacity-70">{formatFileSize(file.fileSize)}</p>
        </div>
        {isDownloading ? (
          <Loader2 className="h-4 w-4 shrink-0 opacity-70 animate-spin" />
        ) : (
          <Download className="h-4 w-4 shrink-0 opacity-70" />
        )}
      </button>
      {file.text && <p className="text-sm">{file.text}</p>}
    </div>
  );
}

export function MessageBubble({
  message, showSenderInfo, showTimestamp, isGroupChat, currentUserId,
  searchQuery, readReceipts, reactions, onEdit, onDelete, onToggleReaction, onReply,
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
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex gap-2 px-4', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
        <div className="relative">
          <div className={cn(
            'absolute z-10 bottom-full mb-1 rounded-lg border border-border bg-popover shadow-md px-1 py-0.5 flex items-center gap-0.5 transition-opacity',
            isOwn ? 'right-0' : 'left-0',
            showToolbar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}>
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
                <ExpandableText text={message.content} query={searchQuery} />
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
            {format(new Date(message.createdAt), 'h:mm a')}
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
