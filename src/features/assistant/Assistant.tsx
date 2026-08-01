import { useEffect, useState } from 'react';
import { AssistantConversationList } from './components/AssistantConversationList';
import { AssistantPanel } from './components/AssistantPanel';

export default function Assistant() {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Assistant | Open Plan AI';
    return () => { document.title = 'Open Plan AI'; };
  }, []);

  return (
    <div className="flex h-full min-h-0">
      <AssistantConversationList
        activeId={activeId}
        onSelect={setActiveId}
        onNewConversation={() => setActiveId(null)}
        onActiveDeleted={() => setActiveId(null)}
      />
      <AssistantPanel
        variant="page"
        className="flex-1 min-w-0"
        conversationId={activeId}
        onConversationCreated={setActiveId}
      />
    </div>
  );
}
