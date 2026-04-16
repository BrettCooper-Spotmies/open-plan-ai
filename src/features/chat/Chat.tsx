import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationList } from './components/ConversationList';
import { MessageArea } from './components/MessageArea';
import { MessageInput } from './components/MessageInput';
import { ChatHeader } from './components/ChatHeader';
import { DetailPanel } from './components/DetailPanel';
import { EmptyState } from './components/EmptyState';
import { TypingIndicator } from './components/TypingIndicator';
import { MessageAreaSkeleton } from './components/MessageAreaSkeleton';
import { MessageSearchBar } from './components/MessageSearchBar';
import { useChatStore } from './stores/useChatStore';
import { useConversations, useMessages, useReactions } from './hooks/useChatData';
import { useTypingIndicator } from './hooks/useTypingIndicator';
import { useReachableUsers } from './hooks/useReachableUsers';
import { useReadReceipts } from './hooks/useReadReceipts';
import { chatService } from '@/services/chat.service';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ChatMessage } from './types';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { activeConversationId, setActiveConversation, isDetailPanelOpen, isMessageSearchOpen } = useChatStore();

  const { conversations, loading: convsLoading, refetch } = useConversations();
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const activeId = conversationId || (isMobile ? null : activeConversationId);
  const { messages, loading: msgsLoading, hasMore, loadMore, refetchMessages, sendMessage, readOnly, readOnlyNotice } = useMessages(activeId ?? null);
  const { reactionMap, handleToggleReaction } = useReactions(messages, user?.id);
  const { data: reachableUsers = [] } = useReachableUsers();
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);

  const activeConv = conversations.find((c) => c.id === activeId);

  const { typingNames, broadcastTyping } = useTypingIndicator(
    activeId,
    activeConv?.members,
    user?.id
  );

  const { readReceiptMap } = useReadReceipts(activeId, messages, user?.id);

  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversation(conversationId);
    }
  }, [conversationId, activeConversationId, setActiveConversation]);

  useEffect(() => {
    setReplyingTo(null);
  }, [activeId]);

  useEffect(() => {
    if (!conversationId || convsLoading) return;
    const existsInList = conversations.some((c) => c.id === conversationId);
    if (existsInList) return;

    // Newly-created project chats can lag briefly in local conversation state.
    // Refetch immediately (and once shortly after) so route-opened chats render without manual refresh.
    refetch().catch(() => {
      // Non-blocking: ConversationList handles fetch errors internally.
    });
    const baseDelayMs = Number(import.meta.env.VITE_CHAT_CONVERSATION_REFETCH_BASE_DELAY_MS ?? 600);
    const maxRetries = Number(import.meta.env.VITE_CHAT_CONVERSATION_REFETCH_MAX_RETRIES ?? 1);

    // Exponential backoff to avoid hardcoding a single delay under varying latency/load.
    const retryDelaysMs = Array.from({ length: maxRetries }, (_, i) => baseDelayMs * (2 ** i));
    let isCancelled = false;

    const retryTimers = retryDelaysMs.map((delayMs) =>
      window.setTimeout(() => {
        if (isCancelled) return;
        refetch().catch(() => {
          // Non-blocking retry.
        });
      }, delayMs)
    );

    return () => {
      isCancelled = true;
      retryTimers.forEach((t) => window.clearTimeout(t));
    };
  }, [conversationId, convsLoading, conversations, refetch]);

  useEffect(() => {
    // On mobile /chat route, do not auto-open a stale cached conversation.
    if (isMobile && !conversationId && activeConversationId) {
      setActiveConversation(null);
    }
  }, [isMobile, conversationId, activeConversationId, setActiveConversation]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    navigate(`/chat/${id}`);
  }, [navigate, setActiveConversation]);

  const handleBack = useCallback(() => {
    setActiveConversation(null);
    navigate('/chat');
  }, [navigate, setActiveConversation]);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      await chatService.editMessage(messageId, newContent);
      await refetchMessages();
    } catch (err) {
      console.error('Failed to edit message:', err);
      toast.error('Failed to edit message');
    }
  }, [refetchMessages]);

  const handleDeleteMessage = useCallback(async (messageId: string, senderName: string) => {
    try {
      await chatService.deleteMessage(messageId, senderName);
      await refetchMessages();
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error('Failed to delete message');
    }
  }, [refetchMessages]);

  const handleReplyMessage = useCallback((message: ChatMessage) => {
    setReplyingTo(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const routeHasConversation = Boolean(conversationId);
  const showConversationList = isMobile ? !routeHasConversation : true;
  const showMessageArea = isMobile ? routeHasConversation : true;

  const typingText = typingNames.length > 0
    ? typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : `${typingNames.length} people typing...`
    : undefined;

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {showConversationList && (
          <div className="w-full md:w-[280px] shrink-0 overflow-hidden">
            <ConversationList
              conversations={conversations}
              loading={convsLoading}
              onSelect={handleSelectConversation}
              onConversationCreated={refetch}
              onlineUserIds={onlineUserIds}
            />
          </div>
        )}

        {showMessageArea && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {activeConv ? (
              <>
                <ChatHeader
                  conversation={activeConv}
                  onBack={isMobile ? handleBack : undefined}
                  onlineUserIds={onlineUserIds}
                  typingText={typingText}
                />
                {isMessageSearchOpen && <MessageSearchBar />}
                {msgsLoading ? (
                  <MessageAreaSkeleton />
                ) : (
                  <MessageArea
                    messages={messages}
                    conversation={activeConv}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    readReceiptMap={readReceiptMap}
                    reactionMap={reactionMap}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onToggleReaction={handleToggleReaction}
                    onReplyMessage={handleReplyMessage}
                  />
                )}
                <TypingIndicator typingNames={typingNames} />
                <MessageInput
                  conversationId={activeConv.id}
                  onMessageSent={refetch}
                  onTyping={broadcastTyping}
                  members={activeConv.members}
                  sendMessage={sendMessage}
                  readOnly={readOnly}
                  readOnlyNotice={readOnlyNotice}
                  replyingTo={replyingTo}
                  onCancelReply={handleCancelReply}
                />
              </>
            ) : (
              routeHasConversation && convsLoading ? <MessageAreaSkeleton /> : <EmptyState type="no-selection" />
            )}
          </div>
        )}

        {isDetailPanelOpen && activeConv && (
          isMobile ? (
            <div className="absolute inset-0 z-20 bg-background">
              <DetailPanel
                conversation={activeConv}
                onRefetch={refetch}
                className="w-full border-l-0"
              />
            </div>
          ) : (
            <DetailPanel conversation={activeConv} onRefetch={refetch} />
          )
        )}
      </div>
    </>
  );
}
