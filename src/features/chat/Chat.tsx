import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConversationList } from './components/ConversationList';
import { MessageArea } from './components/MessageArea';
import { MessageInput } from './components/MessageInput';
import { ChatHeader } from './components/ChatHeader';
import { DetailPanel } from './components/DetailPanel';
import { EmptyState } from './components/EmptyState';
import { useChatStore } from './stores/useChatStore';
import { useConversations, useMessages } from './hooks/useChatData';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { activeConversationId, setActiveConversation, isDetailPanelOpen } = useChatStore();

  const { conversations, loading: convsLoading, refetch } = useConversations();
  const activeId = conversationId || activeConversationId;
  const { messages, loading: msgsLoading, hasMore, loadMore } = useMessages(activeId ?? null);

  // Sync URL param with store
  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversation(conversationId);
    }
  }, [conversationId, activeConversationId, setActiveConversation]);

  const activeConv = conversations.find((c) => c.id === activeId);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    navigate(`/chat/${id}`);
  }, [navigate, setActiveConversation]);

  const handleBack = useCallback(() => {
    setActiveConversation(null);
    navigate('/chat');
  }, [navigate, setActiveConversation]);

  const showConversationList = isMobile ? !activeConv : true;
  const showMessageArea = isMobile ? !!activeConv : true;

  return (
    <AppLayout noPadding>
      <div className="flex h-full overflow-hidden">
        {/* Left panel */}
        {showConversationList && (
          <div className="w-full md:w-[280px] shrink-0 overflow-hidden">
            <ConversationList
              conversations={conversations}
              loading={convsLoading}
              onSelect={handleSelectConversation}
              onConversationCreated={refetch}
            />
          </div>
        )}

        {/* Center panel */}
        {showMessageArea && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {activeConv ? (
              <>
                <ChatHeader conversation={activeConv} onBack={isMobile ? handleBack : undefined} />
                {msgsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <MessageArea
                    messages={messages}
                    conversation={activeConv}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                  />
                )}
                <MessageInput conversationId={activeConv.id} onMessageSent={refetch} />
              </>
            ) : (
              <EmptyState type="no-selection" />
            )}
          </div>
        )}

        {/* Right panel */}
        {!isMobile && isDetailPanelOpen && activeConv && (
          <DetailPanel conversation={activeConv} />
        )}
      </div>
    </AppLayout>
  );
}
