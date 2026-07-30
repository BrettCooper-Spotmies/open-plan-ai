import { useEffect, useState } from 'react';
import { AssistantConversationList } from './components/AssistantConversationList';
import { AssistantPanel } from './components/AssistantPanel';

export default function Assistant() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    document.title = 'Assistant | Open Plan AI';
    return () => { document.title = 'Open Plan AI'; };
  }, []);

  const handleNewConversation = () => {
    setActiveId(null);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="flex h-full min-h-0">
      <AssistantConversationList
        activeId={activeId}
        onSelect={setActiveId}
        onNewConversation={handleNewConversation}
      />
      <AssistantPanel key={resetKey} variant="page" className="flex-1 min-w-0" />
    </div>
  );
}
