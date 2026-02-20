import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chat.service';
import { chatTransport } from '../transport';
import { mapMessage } from '../chat.mappers';
import { useChatStore } from '../stores/useChatStore';
import type { Conversation, ChatMessage } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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
          fetchConversations();
        }
      )
      .subscribe();

    channelRef.current = chatTransport.subscribeToConversationUpdates(
      convIds,
      () => {
        fetchConversations();
      }
    );

    return () => {
      if (channelRef.current) {
        chatTransport.unsubscribe(channelRef.current);
      }
      supabase.removeChannel(msgChannel);
    };
  }, [conversations.length, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const updateChannelRef = useRef<RealtimeChannel | null>(null);
  const PAGE_SIZE = 50;

  // Initial fetch
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(true);
      return;
    }

    let cancelled = false;
    setLoading(true);

    chatService
      .getMessages(conversationId, { limit: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) {
          setMessages(data);
          setHasMore(data.length === PAGE_SIZE);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch messages:', err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
      }
    );

    return () => {
      if (channelRef.current) {
        chatTransport.unsubscribe(channelRef.current);
      }
    };
  }, [conversationId]);

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
      }
    );

    return () => {
      if (updateChannelRef.current) {
        chatTransport.unsubscribe(updateChannelRef.current);
      }
    };
  }, [conversationId]);

  // Explicit refetch used as a fallback after edit/delete actions complete
  const refetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await chatService.getMessages(conversationId, { limit: PAGE_SIZE });
      setMessages(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to refetch messages:', err);
    }
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !messages.length || !hasMore) return;

    const oldest = messages[0];
    const older = await chatService.getMessages(conversationId, {
      before: oldest.createdAt,
      limit: PAGE_SIZE,
    });

    setHasMore(older.length === PAGE_SIZE);
    setMessages((prev) => [...older, ...prev]);
  }, [conversationId, messages, hasMore]);

  return { messages, loading, hasMore, loadMore, refetchMessages };
}
