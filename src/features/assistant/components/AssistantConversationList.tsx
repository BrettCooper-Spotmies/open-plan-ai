import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/useProjects';
import { AssistantConversationRow } from './AssistantConversationRow';
import { useAssistantConversations } from '../hooks/useAssistantConversations';

interface AssistantConversationListProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
}

export function AssistantConversationList({ activeId, onSelect, onNewConversation }: AssistantConversationListProps) {
  const { data: conversations = [], isLoading } = useAssistantConversations();
  const { data: projects = [] } = useProjects();
  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

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
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mx-1 h-14 rounded-lg" />)}

          {!isLoading && conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No conversations yet — ask the assistant something to get started.
            </p>
          )}

          {conversations.map((conversation) => (
            <AssistantConversationRow
              key={conversation.id}
              conversation={conversation}
              projectName={conversation.projectId ? projectNameById.get(conversation.projectId) : undefined}
              isActive={conversation.id === activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
