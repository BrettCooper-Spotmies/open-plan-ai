import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssistantMessageBubble } from './AssistantMessageBubble';
import { AssistantToolStatusChip } from './AssistantToolStatusChip';
import { AssistantQuestionCard } from './AssistantQuestionCard';
import { AssistantCardMessage } from './AssistantCardMessage';
import { isPresentCardMessage, type AssistantCard, type AssistantMessage, type AskUserQuestion } from '../assistantData';
import type { ToolStatusEntry } from '../hooks/useAssistantConversation';
import type { MessageVersionInfo } from '../lib/messageBranches';

interface AssistantTranscriptProps {
  messages: AssistantMessage[];
  messageVersions?: Record<string, MessageVersionInfo>;
  onEditMessage?: (messageId: string, content: string) => void;
  onSelectVersion?: (parentId: string | null, messageId: string) => void;
  streamingText: string;
  isStreaming: boolean;
  toolStatus: ToolStatusEntry[];
  pendingQuestions: AskUserQuestion[] | null;
  onAnswer: (answers: Array<{ header: string; selected: string[] }>) => void;
  isAnswering: boolean;
  liveCard?: AssistantCard | null;
  onSendMessage?: (text: string) => void;
}

export function AssistantTranscript({
  messages,
  messageVersions,
  onEditMessage,
  onSelectVersion,
  streamingText,
  isStreaming,
  toolStatus,
  pendingQuestions,
  onAnswer,
  isAnswering,
  liveCard,
  onSendMessage,
}: AssistantTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // tool-role messages are internal plumbing (the audit trail), not conversation content —
  // except a present_card result, which IS the content, just persisted on a tool-role row
  // (see the plan's "reuse ai_messages.content" persistence approach). assistant messages
  // with no content are tool-call carriers (the model called a tool without emitting any
  // text first) — nothing to show until the real answer arrives.
  const visibleMessages = messages.filter(
    (m) => isPresentCardMessage(m) || (m.role !== 'tool' && !!m.content?.trim()),
  );
  // Once the REST refetch triggered by ai:card lands (which can happen mid-turn,
  // well before ai:done clears liveCard), the same card starts appearing in
  // visibleMessages too. Stop showing the transient liveCard once the persisted
  // list's own tail is already a card, to avoid a brief duplicate render.
  const lastVisibleIsCard =
    visibleMessages.length > 0 && isPresentCardMessage(visibleMessages[visibleMessages.length - 1]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [visibleMessages.length, streamingText, toolStatus.length, pendingQuestions]);

  const showTypingDots = isStreaming && !streamingText && toolStatus.length === 0;

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        {visibleMessages.map((message) => {
          if (isPresentCardMessage(message)) {
            let parsedCard: AssistantCard | null = null;
            try {
              parsedCard = message.content ? (JSON.parse(message.content) as AssistantCard) : null;
            } catch {
              parsedCard = null;
            }
            if (!parsedCard) return null;
            return (
              <AssistantCardMessage
                key={message.id}
                card={parsedCard}
                createdAt={message.createdAt}
                onFollowUp={onSendMessage}
              />
            );
          }
          return (
            <AssistantMessageBubble
              key={message.id}
              id={message.id}
              parentId={message.parentId}
              role={message.role as 'user' | 'assistant'}
              content={message.content ?? ''}
              attachments={message.attachments}
              versionInfo={messageVersions?.[message.id]}
              onEdit={onEditMessage}
              onSelectVersion={onSelectVersion}
              disabled={isStreaming}
            />
          );
        })}

        {toolStatus.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-9">
            {toolStatus.map((entry) => (
              <AssistantToolStatusChip key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {isStreaming && streamingText && <AssistantMessageBubble role="assistant" content={streamingText} />}

        {liveCard && !lastVisibleIsCard && (
          <AssistantCardMessage card={liveCard} createdAt={null} onFollowUp={onSendMessage} />
        )}

        {showTypingDots && (
          <div className="flex items-center gap-1 pl-9">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        )}

        {pendingQuestions && (
          <AssistantQuestionCard questions={pendingQuestions} onSubmit={onAnswer} disabled={isAnswering} />
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
