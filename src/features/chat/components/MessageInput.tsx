import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Send, Paperclip, Loader2, X, Smile, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '../stores/useChatStore';
import { chatService } from '@/services/chat.service';
import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationMember, ChatMessage } from '../types';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { WifiOff, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/services/monitoring/logger';

interface MessageInputProps {
  conversationId: string;
  onMessageSent?: () => void;
  onTyping?: () => void;
  members?: ConversationMember[];
  sendMessage?: (content: string, type?: 'text' | 'file', fileData?: any, replyToMessageId?: string) => Promise<void>;
  readOnly?: boolean;
  readOnlyNotice?: string | null;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

const MAX_CHARS = 4000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 10;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Build file message content payload (shared for send and queue). */
function buildFileContent(payload: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  url?: string;
  text?: string;
}) {
  return {
    fileName: payload.fileName,
    fileSize: payload.fileSize,
    mimeType: payload.mimeType,
    storagePath: payload.storagePath,
    url: payload.url,
    text: payload.text,
  };
}

export function MessageInput({ conversationId, onMessageSent, onTyping, members, sendMessage, readOnly = false, readOnlyNotice = null, replyingTo = null, onCancelReply }: MessageInputProps) {
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const setDraft = useChatStore((s) => s.setDraft);
  const value = useChatStore((s) => s.draftMessages[conversationId] || '');

  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const lastTypingRef = useRef(0);
  const { user } = useAuth();

  const { isOnline, pendingCount, enqueueText, enqueueFile } = useOfflineQueue(user?.id);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartRef = useRef<number>(-1);
  const { createNotification } = useNotifications();

  const otherMembers = useMemo(
    () => (members || []).filter((m) => m.id !== user?.id),
    [members, user?.id]
  );

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const draftLower = value.toLowerCase();
    return otherMembers.filter((m) => {
      const alreadyMentioned = draftLower.includes(`@${m.name.toLowerCase()}`);
      if (alreadyMentioned) return false;
      return m.name.toLowerCase().includes(q);
    });
  }, [mentionQuery, otherMembers, value]);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  }, []);

  useEffect(() => { resize(); }, [value, resize]);

  // Create and revoke object URLs for file previews to avoid memory leaks
  useEffect(() => {
    const urls = pendingFiles.map((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo ? URL.createObjectURL(file) : '';
    });
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!emojiPickerRef.current?.contains(target) && !emojiButtonRef.current?.contains(target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji: any) => {
    const native = emoji.native as string;
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const newValue = value.substring(0, start) + native + value.substring(end);
      if (newValue.length <= MAX_CHARS) {
        setDraft(conversationId, newValue);
        requestAnimationFrame(() => {
          const pos = start + native.length;
          el.setSelectionRange(pos, pos);
        });
      }
    } else {
      setDraft(conversationId, value + native);
    }
    // Picker stays open
  };

  const insertMention = (member: ConversationMember) => {
    const start = mentionStartRef.current;
    const el = textareaRef.current;
    if (start < 0 || !el) return;
    const before = value.substring(0, start);
    const after = value.substring(el.selectionStart);
    const newValue = `${before}@${member.name} ${after}`;
    setDraft(conversationId, newValue);
    setMentionQuery(null);
    mentionStartRef.current = -1;
    setMentionIndex(0);
    requestAnimationFrame(() => {
      const pos = start + member.name.length + 2;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles = Array.from(incoming);
    const tooBig = newFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (tooBig.length > 0) {
      toast.error(`${tooBig.length} file(s) exceed 10MB limit and were skipped`);
    }
    const valid = newFiles.filter(f => f.size <= MAX_FILE_SIZE);
    setPendingFiles(prev => {
      const seen = new Set(prev.map(f => `${f.name}-${f.size}-${f.lastModified}`));
      const deduped = valid.filter(f => {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (deduped.length < valid.length) {
        toast.info('Duplicate file(s) were skipped.');
      }
      const combined = [...prev, ...deduped];
      if (combined.length > MAX_FILES) {
        const dropped = combined.length - MAX_FILES;
        const droppedNames = combined.slice(MAX_FILES).map(f => f.name).join(', ');
        toast.warning(`Only ${MAX_FILES} files allowed. Dropped: ${droppedNames || dropped + ' file(s)'}.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendFileMessage = async (file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    if (replyingTo?.id) formData.append('replyToMessageId', replyingTo.id);
    const res = await apiClient.raw.post<{ success: boolean; data: any }>(
      `${ENDPOINTS.CONVERSATIONS.FILE_MESSAGE(conversationId)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data.data;
  };

  const handleSend = async () => {
    if (readOnly) return;
    const trimmed = value.trim();
    if ((!trimmed && pendingFiles.length === 0) || isSending) return;
    if (pendingFiles.length > MAX_FILES) {
      toast.warning(`Maximum ${MAX_FILES} files allowed. Remove some before sending.`);
      return;
    }

    setDraft(conversationId, '');
    setMentionQuery(null);

    // ── OFFLINE: enqueue everything locally ──────────────────────────────
    if (!isOnline) {
      try {
        if (trimmed) await enqueueText(conversationId, trimmed);
        if (pendingFiles.length > 0) {
          await Promise.all(pendingFiles.map((file) => enqueueFile(conversationId, file)));
        }
        setPendingFiles([]);
        toast.info('📵 Saved offline — will send when you reconnect');
      } catch (err) {
        logger.error('[MessageInput] Offline queue failed:', err);
        toast.error('Failed to save message offline. Please try again.');
      }
      return;
    }

    // ── ONLINE: send normally ─────────────────────────────────────────────
    setIsSending(true);
    try {
      if (pendingFiles.length > 0) {
        if (trimmed) {
          if (sendMessage) await sendMessage(trimmed, 'text', undefined, replyingTo?.id);
          else await chatService.sendMessage(conversationId, trimmed, undefined, replyingTo?.id);
        }
        for (const file of pendingFiles) {
          await sendFileMessage(file);
        }
        setPendingFiles([]);
      } else {
        if (sendMessage) await sendMessage(trimmed, 'text', undefined, replyingTo?.id);
        else await chatService.sendMessage(conversationId, trimmed, undefined, replyingTo?.id);
      }

      otherMembers.forEach((member) => {
        if (trimmed.includes(`@${member.name}`)) {
          try {
            createNotification.mutate({
              user_id: member.id,
              actor_id: user?.id,
              type: 'mention',
              title: 'Mentioned you in a message',
              description: trimmed.length > 100 ? trimmed.substring(0, 97) + '...' : trimmed,
            });
          } catch (notifErr) {
            logger.warn('[MessageInput] Failed to create mention notification:', notifErr);
          }
        }
      });

      onMessageSent?.();
      onCancelReply?.();
    } catch (err) {
      logger.error('Failed to send message:', err);
      toast.error('Failed to send message');
      setDraft(conversationId, trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(p => (p + 1) % filteredMentions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(p => (p - 1 + filteredMentions.length) % filteredMentions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredMentions[mentionIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); mentionStartRef.current = -1; return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length > MAX_CHARS) return;
    setDraft(conversationId, newValue);

    const now = Date.now();
    if (now - lastTypingRef.current > 2000) { lastTypingRef.current = now; onTyping?.(); }

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const queryText = textBeforeCursor.substring(lastAtIndex + 1);
      if ((charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) && !queryText.includes(' ')) {
        mentionStartRef.current = lastAtIndex;
        setMentionQuery(queryText);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
    mentionStartRef.current = -1;
  };

  const showCharCount = value.length > MAX_CHARS * 0.9;

  return (
    <div className="border-t border-border/70 bg-gradient-to-t from-background via-background/95 to-background/80 px-2 md:px-4 py-2">

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 font-medium">No internet connection — messages will be queued</span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {pendingCount} queued
            </span>
          )}
        </div>
      )}

      {readOnly && readOnlyNotice && (
        <div className="mb-2 px-3 py-2 rounded-lg border border-amber-300/30 bg-amber-500/10 text-amber-700 text-xs">
          {readOnlyNotice}
        </div>
      )}

      {replyingTo && (
        <div className="mb-2 px-3 py-2 rounded-lg border border-border/60 bg-muted/40">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Replying to {replyingTo.senderName}
              </p>
              <p className="text-xs truncate">
                {replyingTo.deletedAt
                  ? 'Message deleted'
                  : replyingTo.contentType === 'file'
                    ? 'Attachment'
                    : replyingTo.content}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Pending files preview grid ── */}
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((file, i) => {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            const previewUrl = (isImage || isVideo) ? previewUrls[i] || null : null;

            return (
              <div
                key={i}
                className="relative group w-16 h-16 rounded-lg border bg-muted overflow-hidden shrink-0 flex items-center justify-center"
              >
                {isImage && previewUrl ? (
                  <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                ) : isVideo && previewUrl ? (
                  <video src={previewUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 p-1.5 w-full h-full">
                    <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-[8px] font-bold text-primary bg-primary/10 rounded px-1 py-0.5 uppercase leading-none shrink-0">
                      {file.name.split('.').pop()}
                    </span>
                    <span className="text-[8px] text-muted-foreground text-center leading-tight line-clamp-2 w-full break-all">
                      {file.name.replace(/\.[^.]+$/, '')}
                    </span>
                  </div>
                )}

                {/* Size badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate px-0.5">
                  {formatBytes(file.size)}
                </div>

                {/* Remove button */}
                <button
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                  onClick={() => removeFile(i)}
                  title="Remove"
                  type="button"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}

          {/* +Add more slot (if < 10) */}
          {pendingFiles.length < MAX_FILES && (
            <button
              type="button"
              className="w-16 h-16 rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Add more files"
            >
              <Paperclip className="h-4 w-4" />
              <span className="text-[9px]">Add</span>
            </button>
          )}

          {/* Count badge */}
          <div className="self-end text-[10px] text-muted-foreground pb-1">
            {pendingFiles.length}/{MAX_FILES}
          </div>
        </div>
      )}

      <div className="relative">
        {/* Mention dropdown */}
        {mentionQuery !== null && filteredMentions.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-full max-w-[280px] bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
            {filteredMentions.map((member, i) => (
              <button
                key={member.id}
                className={cn('flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors', i === mentionIndex && 'bg-muted')}
                onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
              >
                <span className="font-medium">{member.name}</span>
                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-0 z-50 shadow-2xl rounded-xl overflow-hidden">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="auto"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={2}
              perLine={8}
            />
          </div>
        )}

        {/* Hidden inputs — both support multiple */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />

        {/* Input bar */}
        <div className="mx-auto w-full max-w-[860px] flex items-center gap-1 rounded-2xl border border-input/80 bg-background/85 backdrop-blur-md px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] focus-within:ring-2 focus-within:ring-ring/70 focus-within:ring-offset-2 ring-offset-background transition-all">

          {/* 😊 Emoji */}
          <Button
            ref={emojiButtonRef}
            variant="ghost" size="icon" type="button"
            className={cn(
              'h-7 w-7 md:h-8 md:w-8 shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors',
              'rounded-full hover:bg-accent/70',
              showEmojiPicker && 'text-yellow-500 bg-yellow-500/10'
            )}
            title="Emoji"
            onClick={() => setShowEmojiPicker(v => !v)}
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* 📎 File */}
          <Button
            variant="ghost" size="icon" type="button"
            className="h-7 w-7 md:h-8 md:w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
            title="Attach files"
            onClick={() => fileInputRef.current?.click()}
            disabled={readOnly}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Textarea */}
          <div className="flex-1 min-w-0 relative px-0.5 flex items-center min-h-[28px] md:min-h-[32px]">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? 'Type a message...' : 'Type a message... Use @ to mention'}
              rows={1}
              className="w-full resize-none bg-transparent text-sm leading-5 max-h-[140px] placeholder:text-muted-foreground/90 focus-visible:outline-none"
              disabled={readOnly}
            />
            {showCharCount && (
              <span className="absolute bottom-0.5 right-1 text-[10px] text-muted-foreground">
                {value.length}/{MAX_CHARS}
              </span>
            )}
          </div>

          {/* Send */}
          <Button
            size="icon" type="button"
            className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(0,0,0,0.22)] hover:bg-primary/90"
            disabled={readOnly || ((!value.trim() && pendingFiles.length === 0) || isSending)}
            onClick={handleSend}
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
