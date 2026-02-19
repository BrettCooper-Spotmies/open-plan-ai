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
    <div className="border-t border-border px-4 py-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" title="Attach file">
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0 relative">
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
          disabled={!value.trim()}
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
