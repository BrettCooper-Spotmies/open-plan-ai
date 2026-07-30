import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssistantConversationRow } from './AssistantConversationRow';
import { ASSISTANT_RECENT_CONVERSATIONS } from '../assistantData';

interface AssistantConversationListProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
}

export function AssistantConversationList({ activeId, onSelect, onNewConversation }: AssistantConversationListProps) {
  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-r border-border">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={onNewConversation}>
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>

      <ScrollArea className="flex-1 min-h-0 px-2">
        <div className="space-y-1 pb-2">
          {ASSISTANT_RECENT_CONVERSATIONS.map((conversation) => (
            <AssistantConversationRow
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
