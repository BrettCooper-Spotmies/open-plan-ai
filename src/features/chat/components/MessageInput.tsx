import { useRef, useEffect, useCallback, useState } from 'react';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '../stores/useChatStore';
import { chatService } from '@/services/chat.service';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MessageInputProps {
  conversationId: string;
  onMessageSent?: () => void;
  onTyping?: () => void;
}

const MAX_CHARS = 4000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function MessageInput({ conversationId, onMessageSent, onTyping }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setDraft = useChatStore((s) => s.setDraft);
  const value = useChatStore((s) => s.draftMessages[conversationId] || '');
  const [isSending, setIsSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const lastTypingRef = useRef(0);
  const { user } = useAuth();

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleSend = async () => {
    const trimmed = value.trim();
    if ((!trimmed && !pendingFile) || isSending) return;

    setIsSending(true);
    setDraft(conversationId, '');

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setDraft(conversationId, e.target.value);
      // Debounced typing broadcast
      const now = Date.now();
      if (now - lastTypingRef.current > 2000) {
        lastTypingRef.current = now;
        onTyping?.();
      }
    }
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
            placeholder="Type a message..."
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
  );
}
