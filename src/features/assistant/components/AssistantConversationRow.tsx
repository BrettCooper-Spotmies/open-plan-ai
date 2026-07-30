import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssistantConversation } from '../assistantData';

interface AssistantConversationRowProps {
  conversation: AssistantConversation;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function AssistantConversationRow({ conversation, isActive, onSelect }: AssistantConversationRowProps) {
  const Icon = conversation.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
        isActive ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <div className="flex items-start gap-2">
        {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{conversation.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{conversation.subtitle}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
              {conversation.scope}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{conversation.timeAgo}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
