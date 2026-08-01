import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { resolveConversationScopeLabel, type AssistantConversationSummary } from '../assistantData';

interface AssistantConversationRowProps {
  conversation: AssistantConversationSummary;
  projectName?: string;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function AssistantConversationRow({ conversation, projectName, isActive, onSelect }: AssistantConversationRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
        isActive ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <p className="truncate text-sm font-semibold text-foreground">{conversation.title || 'New conversation'}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
          {resolveConversationScopeLabel(conversation.scope, projectName)}
        </Badge>
        {conversation.status === 'awaiting_input' && (
          <Badge className="h-4 px-1.5 text-[10px] font-normal">Needs input</Badge>
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
}
