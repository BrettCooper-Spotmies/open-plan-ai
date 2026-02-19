import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { MessageDateDivider } from './MessageDateDivider';
import { SystemMessage } from './SystemMessage';
import { EmptyState } from './EmptyState';
import { ChatMessage, Conversation } from '../types';
import { CURRENT_USER_ID } from '../mockData';
import { isSameDay, differenceInMinutes } from 'date-fns';

interface MessageAreaProps {
  messages: ChatMessage[];
  conversation: Conversation;
}

export function MessageArea({ messages, conversation }: MessageAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isGroup = conversation.type === 'group';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return <EmptyState type="no-messages" />;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-0.5 py-4">
        {messages.map((msg, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const next = i < messages.length - 1 ? messages[i + 1] : null;
          const msgDate = new Date(msg.createdAt);

          // Date divider
          const showDateDivider = !prev || !isSameDay(new Date(prev.createdAt), msgDate);

          // System message
          if (msg.contentType === 'system') {
            return (
              <div key={msg.id}>
                {showDateDivider && <MessageDateDivider date={msgDate} />}
                <SystemMessage content={msg.content} />
              </div>
            );
          }

          // Grouping: same sender within 2 min
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
                />
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
