import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chat.service';
import { chatTransport } from '../transport';
import { mapMessage } from '../chat.mappers';
import { useChatStore } from '../stores/useChatStore';
import type { Conversation, ChatMessage, MessageReaction } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Stale-while-revalidate hook for conversations.
 *
 * On mount:
 * - If the store already has conversations → return them instantly (loading = false).
 *   A background revalidation is kicked off if the data is stale.
 * - If the store is empty → show loading, fetch, and populate the store.
 */
export function useConversations() {
  const {
    conversations: cachedConversations,
    setConversations,
    isConversationsStale,
  } = useChatStore();

  const hasCachedData = cachedConversations.length > 0;

  const [conversations, setLocalConversations] = useState<Conversation[]>(cachedConversations);
  const [loading, setLoading] = useState(!hasCachedData);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const fetchConversations = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true);
      const data = await chatService.getConversations();
      if (isMountedRef.current) {
        setLocalConversations(data);
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      if (isMountedRef.current && !background) setLoading(false);
    }
  }, [setConversations]);

  // Initial fetch / revalidation
  useEffect(() => {
    isMountedRef.current = true;

    if (hasCachedData) {
      // Data already available — show it instantly
      setLocalConversations(cachedConversations);
      setLoading(false);

      // Background-revalidate if stale
      if (isConversationsStale()) {
        fetchConversations(true);
      }
    } else {
      // No cached data — initial load with shimmer
      fetchConversations(false);
    }

    return () => {
      isMountedRef.current = false;
    };
    // Only run on mount — cachedConversations is read from initial snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to realtime updates — also track unread
  useEffect(() => {
    if (!conversations.length) return;

    const convIds = conversations.map((c) => c.id);

    // Listen for new messages across all conversations for unread tracking
    const msgChannel = supabase
      .channel('global-new-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          const activeId = useChatStore.getState().activeConversationId;
          if (convIds.includes(newMsg.conversation_id) && newMsg.conversation_id !== activeId) {
            useChatStore.getState().incrementUnread(newMsg.conversation_id);
          }
          fetchConversations(true);
        }
      )
      .subscribe();

    channelRef.current = chatTransport.subscribeToConversationUpdates(
      convIds,
      () => {
        fetchConversations(true);
      }
    );

    return () => {
      if (channelRef.current) {
        chatTransport.unsubscribe(channelRef.current);
      }
      supabase.removeChannel(msgChannel);
    };
  }, [conversations.length, fetchConversations]);

  return { conversations, loading, refetch: () => fetchConversations(true) };
}

/**
 * Stale-while-revalidate hook for messages.
 *
 * On mount / conversationId change:
 * - If the store has cached messages for this conversation → return them instantly.
 *   A background revalidation is kicked off if the data is stale.
 * - If no cache → show loading, fetch, and populate the store.
 */
export function useMessages(conversationId: string | null) {
  const {
    getCachedMessages,
    setCachedMessages,
    isMessagesStale,
    addMessage: storeAddMessage,
    updateMessage: storeUpdateMessage,
    appendOlderMessages: storeAppendOlder,
  } = useChatStore();

  const cached = conversationId ? getCachedMessages(conversationId) : null;
  const hasCachedData = !!cached;

  const [messages, setMessages] = useState<ChatMessage[]>(cached?.messages ?? []);
  const [loading, setLoading] = useState(!hasCachedData && !!conversationId);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const updateChannelRef = useRef<RealtimeChannel | null>(null);
  const PAGE_SIZE = 50;

  // Initial fetch / revalidation
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(true);
      setLoading(false);
      return;
    }

    const cachedEntry = getCachedMessages(conversationId);

    if (cachedEntry) {
      // Show cached data immediately
      setMessages(cachedEntry.messages);
      setHasMore(cachedEntry.hasMore);
      setLoading(false);

      // Background-revalidate if stale
      if (isMessagesStale(conversationId)) {
        chatService
          .getMessages(conversationId, { limit: PAGE_SIZE })
          .then((data) => {
            setMessages(data);
            setHasMore(data.length === PAGE_SIZE);
            setCachedMessages(conversationId, data, data.length === PAGE_SIZE);
          })
          .catch((err) => console.error('Background message revalidation failed:', err));
      }
    } else {
      // No cache — fetch with loading indicator
      let cancelled = false;
      setLoading(true);

      chatService
        .getMessages(conversationId, { limit: PAGE_SIZE })
        .then((data) => {
          if (!cancelled) {
            setMessages(data);
            setHasMore(data.length === PAGE_SIZE);
            setLoading(false);
            setCachedMessages(conversationId, data, data.length === PAGE_SIZE);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch messages:', err);
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Realtime subscription for new messages (INSERT)
  useEffect(() => {
    if (!conversationId) return;

    channelRef.current = chatTransport.subscribeToMessages(
      conversationId,
      async (payload) => {
        const newMsg = payload.new;
        // Fetch sender profile for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, initials, role')
          .eq('id', newMsg.sender_id)
          .single();

        const mapped = mapMessage(newMsg, profile as any);

        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
        // Also update the store cache
        storeAddMessage(conversationId, mapped);
      }
    );

    return () => {
      if (channelRef.current) {
        chatTransport.unsubscribe(channelRef.current);
      }
    };
  }, [conversationId, storeAddMessage]);

  // Realtime subscription for message edits & soft-deletes (UPDATE)
  useEffect(() => {
    if (!conversationId) return;

    updateChannelRef.current = chatTransport.subscribeToMessageUpdates(
      conversationId,
      (payload) => {
        const updatedRow = payload.new as any;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== updatedRow.id) return m;
            // Re-map the updated DB row, preserving sender info from existing state
            return mapMessage(updatedRow, {
              id: m.senderId,
              name: m.senderName,
              initials: m.senderInitials,
            } as any);
          })
        );
        // Also update the store cache
        storeUpdateMessage(conversationId, updatedRow.id, (m) =>
          mapMessage(updatedRow, {
            id: m.senderId,
            name: m.senderName,
            initials: m.senderInitials,
          } as any)
        );
      }
    );

    return () => {
      if (updateChannelRef.current) {
        chatTransport.unsubscribe(updateChannelRef.current);
      }
    };
  }, [conversationId, storeUpdateMessage]);

  // Explicit refetch used as a fallback after edit/delete actions complete
  const refetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await chatService.getMessages(conversationId, { limit: PAGE_SIZE });
      setMessages(data);
      setHasMore(data.length === PAGE_SIZE);
      setCachedMessages(conversationId, data, data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to refetch messages:', err);
    }
  }, [conversationId, setCachedMessages]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !messages.length || !hasMore) return;

    const oldest = messages[0];
    const older = await chatService.getMessages(conversationId, {
      before: oldest.createdAt,
      limit: PAGE_SIZE,
    });

    const newHasMore = older.length === PAGE_SIZE;
    setHasMore(newHasMore);
    setMessages((prev) => [...older, ...prev]);
    // Also update the store cache
    storeAppendOlder(conversationId, older, newHasMore);
  }, [conversationId, messages, hasMore, storeAppendOlder]);

  return { messages, loading, hasMore, loadMore, refetchMessages };
}

export function useReactions(messages: ChatMessage[], currentUserId?: string) {
  const [reactionMap, setReactionMap] = useState<Record<string, MessageReaction[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchReactions = useCallback(async () => {
    if (!messages.length || !currentUserId) return;
    try {
      const map = await chatService.getReactions(
        messages.map((m) => m.id),
        currentUserId
      );
      setReactionMap(map);
    } catch (err) {
      console.error('Failed to fetch reactions:', err);
    }
  }, [messages, currentUserId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Realtime subscription for reaction changes
  useEffect(() => {
    if (!messages.length) return;

    const channel = supabase
      .channel('message-reactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [messages.length, fetchReactions]);

  const handleToggleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await chatService.toggleReaction(messageId, emoji);
      // Optimistic: refetch immediately
      await fetchReactions();
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  }, [fetchReactions]);

  return { reactionMap, handleToggleReaction };
}
