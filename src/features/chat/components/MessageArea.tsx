import { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { MessageDateDivider } from './MessageDateDivider';
import { SystemMessage } from './SystemMessage';
import { EmptyState } from './EmptyState';
import { ChatMessage, Conversation, ReadReceipt, MessageReaction } from '../types';
import { isSameDay, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useChatStore } from '../stores/useChatStore';

interface MessageAreaProps {
  messages: ChatMessage[];
  conversation: Conversation;
  hasMore?: boolean;
  onLoadMore?: () => void;
  readReceiptMap?: Record<string, ReadReceipt[]>;
  reactionMap?: Record<string, MessageReaction[]>;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string, senderName: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

export function MessageArea({ messages, conversation, hasMore, onLoadMore, readReceiptMap, reactionMap, onEditMessage, onDeleteMessage, onToggleReaction }: MessageAreaProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isGroup = conversation.type === 'group';
  const searchQuery = useChatStore((s) => s.messageSearchQuery);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  if (messages.length === 0) {
    return <EmptyState type="no-messages" />;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-0.5 pt-4 pb-2">
        {hasMore && onLoadMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={onLoadMore} className="text-xs text-muted-foreground">
              Load older messages
            </Button>
          </div>
        )}
        {filteredMessages.map((msg, i) => {
          const prev = i > 0 ? filteredMessages[i - 1] : null;
          const next = i < filteredMessages.length - 1 ? filteredMessages[i + 1] : null;
          const msgDate = new Date(msg.createdAt);

          const showDateDivider = !prev || !isSameDay(new Date(prev.createdAt), msgDate);

          if (msg.contentType === 'system') {
            return (
              <div key={msg.id}>
                {showDateDivider && <MessageDateDivider date={msgDate} />}
                <SystemMessage content={msg.content} />
              </div>
            );
          }

          const isSameSenderAsPrev = prev && prev.senderId === msg.senderId && prev.contentType !== 'system' &&
            differenceInMinutes(msgDate, new Date(prev.createdAt)) < 2 && !showDateDivider;

          const isSameSenderAsNext = next && next.senderId === msg.senderId && next.contentType !== 'system' &&
            differenceInMinutes(new Date(next.createdAt), msgDate) < 2 &&
            (next ? isSameDay(new Date(next.createdAt), msgDate) : false);

          const showSenderInfo = !isSameSenderAsPrev;
          const showTimestamp = !isSameSenderAsNext;

          return (
            <div key={msg.id}>
              {showDateDivider && <MessageDateDivider date={msgDate} />}
              <div className={showSenderInfo && i > 0 ? 'mt-3' : 'mt-0.5'}>
                <MessageBubble
                  message={msg}
                  showSenderInfo={showSenderInfo}
                  showTimestamp={showTimestamp}
                  isGroupChat={isGroup}
                  currentUserId={user?.id}
                  searchQuery={searchQuery}
                  readReceipts={readReceiptMap?.[msg.id]}
                  reactions={reactionMap?.[msg.id]}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onToggleReaction={onToggleReaction}
                />
              </div>
            </div>
          );
        })}
        {searchQuery.trim() && filteredMessages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">No messages match your search</div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
