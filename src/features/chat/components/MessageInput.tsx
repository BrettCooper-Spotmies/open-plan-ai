import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '../stores/useChatStore';
import { chatService } from '@/services/chat.service';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationMember } from '../types';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  conversationId: string;
  onMessageSent?: () => void;
  onTyping?: () => void;
  members?: ConversationMember[];
}

const MAX_CHARS = 4000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function MessageInput({ conversationId, onMessageSent, onTyping, members }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setDraft = useChatStore((s) => s.setDraft);
  const value = useChatStore((s) => s.draftMessages[conversationId] || '');
  const [isSending, setIsSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const lastTypingRef = useRef(0);
  const { user } = useAuth();

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartRef = useRef<number>(-1);

  const otherMembers = useMemo(
    () => (members || []).filter((m) => m.id !== user?.id),
    [members, user?.id]
  );

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return otherMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [mentionQuery, otherMembers]);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

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

    // Set cursor after mention
    requestAnimationFrame(() => {
      const pos = start + member.name.length + 2; // @Name + space
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if ((!trimmed && !pendingFile) || isSending) return;

    setIsSending(true);
    setDraft(conversationId, '');
    setMentionQuery(null);

    try {
      if (pendingFile) {
        await sendFileMessage(pendingFile, trimmed);
        setPendingFile(null);
      } else {
        await chatService.sendMessage(conversationId, trimmed);
      }
      onMessageSent?.();
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
      setDraft(conversationId, trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const sendFileMessage = async (file: File, text?: string) => {
    const ext = file.name.split('.').pop();
    const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file);
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(path);

    const content = JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      url: urlData.publicUrl,
      text: text || undefined,
    });

    const userId = user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        content_type: 'file',
      });
    if (error) throw error;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 10MB');
      return;
    }
    setPendingFile(file);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention navigation
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        mentionStartRef.current = -1;
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length > MAX_CHARS) return;

    setDraft(conversationId, newValue);

    // Debounced typing broadcast
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      onTyping?.();
    }

    // Mention detection
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const queryText = textBeforeCursor.substring(lastAtIndex + 1);
      // Only trigger if @ is at start or after whitespace, and no space in query
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
    <div className="border-t border-border px-4 py-2">
      {pendingFile && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-muted text-sm">
          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate flex-1">{pendingFile.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {(pendingFile.size / 1024).toFixed(0)}KB
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setPendingFile(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="relative">
        {/* Mention dropdown */}
        {mentionQuery !== null && filteredMentions.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-full max-w-[280px] bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
            {filteredMentions.map((member, i) => (
              <button
                key={member.id}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors',
                  i === mentionIndex && 'bg-muted'
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(member);
                }}
              >
                <span className="font-medium">{member.name}</span>
                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... Use @ to mention"
              rows={1}
              className="w-full resize-none bg-transparent py-1.5 text-sm leading-5 placeholder:text-muted-foreground focus-visible:outline-none"
            />
            {showCharCount && (
              <span className="absolute bottom-0.5 right-1 text-[10px] text-muted-foreground">
                {value.length}/{MAX_CHARS}
              </span>
            )}
          </div>

          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-md"
            disabled={(!value.trim() && !pendingFile) || isSending}
            onClick={handleSend}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
