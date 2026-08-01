import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryClient';
import { assistantService } from '@/services/assistant.service';
import { aiAssistantTransport } from '../transport';
import type { AskUserQuestion, AssistantCard } from '../assistantData';

export interface ToolStatusEntry {
  id: string;
  tool: string;
  summary?: string;
  done: boolean;
}

/**
 * Owns everything needed to render one active conversation: the persisted
 * detail (React Query), plus live streaming state fed by the socket
 * transport (tokens, tool status, a paused clarifying question). On
 * ai:done/ai:question/ai:error the live state is cleared and the persisted
 * detail is refetched — simpler and more robust than trying to locally
 * splice the exact final message in.
 */
export function useAssistantConversation(conversationId: string | null) {
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<ToolStatusEntry[]>([]);
  const [liveQuestion, setLiveQuestion] = useState<AskUserQuestion[] | null>(null);
  const [liveCard, setLiveCard] = useState<AssistantCard | null>(null);
  const toolSeqRef = useRef(0);

  const query = useQuery({
    queryKey: queryKeys.assistant.conversation(conversationId ?? ''),
    queryFn: () => assistantService.getConversation(conversationId as string),
    enabled: !!conversationId,
  });

  const invalidate = useCallback(() => {
    if (!conversationId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.assistant.conversation(conversationId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.assistant.conversations() });
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId) return;

    aiAssistantTransport.connect();
    aiAssistantTransport.joinConversation(conversationId);

    setStreamingText('');
    setToolStatus([]);
    setLiveQuestion(null);
    setLiveCard(null);

    const unsubs = [
      aiAssistantTransport.onToken((token) => {
        setIsStreaming(true);
        setStreamingText((prev) => prev + token);
      }),
      aiAssistantTransport.onToolCall((tool) => {
        setIsStreaming(true);
        toolSeqRef.current += 1;
        setToolStatus((prev) => [...prev, { id: `${toolSeqRef.current}`, tool, done: false }]);
      }),
      aiAssistantTransport.onToolResult((tool, summary) => {
        setToolStatus((prev) => {
          const reverseIdx = [...prev].reverse().findIndex((t) => t.tool === tool && !t.done);
          if (reverseIdx === -1) return prev;
          const idx = prev.length - 1 - reverseIdx;
          const next = [...prev];
          next[idx] = { ...next[idx], done: true, summary };
          return next;
        });
      }),
      aiAssistantTransport.onQuestion((questions) => {
        setLiveQuestion(questions);
        setIsStreaming(false);
        invalidate();
      }),
      aiAssistantTransport.onCard((card) => {
        // Unlike ask_user, a card doesn't pause the turn — the model may
        // still add a closing sentence or call another tool, so streaming
        // state is left alone here.
        setLiveCard(card);
        invalidate();
      }),
      aiAssistantTransport.onDone(() => {
        setIsStreaming(false);
        setStreamingText('');
        setToolStatus([]);
        setLiveCard(null);
        invalidate();
      }),
      aiAssistantTransport.onError((_code, message) => {
        setIsStreaming(false);
        toast.error(message || 'The assistant hit an error answering that.');
        invalidate();
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
      aiAssistantTransport.leaveConversation(conversationId);
    };
  }, [conversationId, invalidate]);

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => assistantService.sendMessage(conversationId as string, message),
    onSuccess: () => {
      setIsStreaming(true);
      setStreamingText('');
      setToolStatus([]);
      setLiveQuestion(null);
      setLiveCard(null);
      invalidate();
    },
    onError: () => toast.error("Couldn't send that message — try again."),
  });

  const answerQuestionMutation = useMutation({
    mutationFn: (answers: Array<{ header: string; selected: string[] }>) =>
      assistantService.answerQuestion(conversationId as string, { answers }),
    onSuccess: () => {
      setLiveQuestion(null);
      setLiveCard(null);
      setIsStreaming(true);
      setStreamingText('');
      setToolStatus([]);
      invalidate();
    },
    onError: () => toast.error("Couldn't submit that answer — try again."),
  });

  const pendingQuestions = liveQuestion ?? query.data?.pendingQuestions ?? null;

  return {
    conversation: query.data,
    isLoading: query.isLoading,
    streamingText,
    isStreaming,
    toolStatus,
    pendingQuestions,
    liveCard,
    sendMessage: useCallback((text: string) => sendMessageMutation.mutate(text), [sendMessageMutation]),
    answerQuestion: useCallback(
      (answers: Array<{ header: string; selected: string[] }>) => answerQuestionMutation.mutate(answers),
      [answerQuestionMutation],
    ),
    isSending: sendMessageMutation.isPending,
    isAnswering: answerQuestionMutation.isPending,
  };
}
