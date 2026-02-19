import { useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '../stores/useChatStore';
import { toast } from 'sonner';

interface MessageInputProps {
  conversationId: string;
}

const MAX_CHARS = 4000;

export function MessageInput({ conversationId }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draft = useChatStore((s) => s.getDraft(conversationId));
  const setDraft = useChatStore((s) => s.setDraft);

  const value = useChatStore((s) => s.draftMessages[conversationId] || '');

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px'; // max ~6 lines
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleSend = () => {
    if (!value.trim()) return;
    toast.success('Message sent (mock)');
    setDraft(conversationId, '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showCharCount = value.length > MAX_CHARS * 0.9;

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" title="Attach file">
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setDraft(conversationId, e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {showCharCount && (
            <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
              {value.length}/{MAX_CHARS}
            </span>
          )}
        </div>

        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!value.trim()}
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
