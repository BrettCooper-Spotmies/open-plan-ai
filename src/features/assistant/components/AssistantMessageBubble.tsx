import { Sparkles } from 'lucide-react';

interface AssistantMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function AssistantMessageBubble({ role, content }: AssistantMessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-foreground">
        {content}
      </div>
    </div>
  );
}
