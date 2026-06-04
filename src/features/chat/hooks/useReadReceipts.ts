import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from '@/services/chat.service';
import { chatTransport } from '../transport';
import type { ChatMessage, ReadReceipt } from '../types';
import type { Unsubscribe } from '../transport/IChatTransport';
import { logger } from '@/services/monitoring/logger';

/**
 * Manages read receipts for an active conversation.
 *
 * - Marks the conversation as read whenever it is opened or new messages arrive.
 * - Fetches existing read receipts for all visible messages.
 * - Subscribes to realtime INSERT events on `message_reads` using a ref
 *   so new message IDs are always visible inside the callback (no stale closure).
 */
export function useReadReceipts(
  conversationId: string | null | undefined,
  messages: ChatMessage[],
  currentUserId: string | undefined
) {
  const [readReceiptMap, setReadReceiptMap] = useState<Record<string, ReadReceipt[]>>({});
  const channelRef = useRef<Unsubscribe | null>(null);

  // Always-current set of message IDs – used inside the realtime callback
  // so we never filter out receipts due to a stale closure.
  const messageIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  // ─── Mark as read + fetch receipts ───────────────────────────────────────
  const markAndFetch = useCallback(async (convId: string, msgs: ChatMessage[]) => {
    if (!msgs.length) return;
    try {
      // Mark conversation as read (fire-and-forget; errors are logged not thrown)
      chatService.markConversationAsRead(convId).catch((err) => {
        logger.error('[ReadReceipts] markConversationAsRead failed:', err);
      });

      const ids = msgs.map((m) => m.id).filter(id => !id.startsWith('temp-'));
      if (ids.length === 0) {
        setReadReceiptMap({});
        return;
      }
      const map = await chatService.getReadReceipts(ids);
      setReadReceiptMap(map);
    } catch (err) {
      logger.error('[ReadReceipts] getReadReceipts failed:', err);
    }
  }, []);

  // Fire when conversation changes (reset state) or when messages load/grow
  useEffect(() => {
    if (!conversationId) {
      setReadReceiptMap({});
      return;
    }
    markAndFetch(conversationId, messages);
    // Intentionally depend on messages.length so we retrigger on new arrivals
    // without recreating the effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length]);

  // ─── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    // Clean up any previous subscription before creating a new one
    if (channelRef.current) {
      chatTransport.unsubscribe(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = chatTransport.subscribeToReadReceipts(
      conversationId,
      (payload) => {
        const row = payload.new as {
          message_id: string;
          user_id: string;
          read_at: string;
        };
        if (!row?.message_id) return;

        // Use the ref so we always have the latest message IDs (no stale closure)
        if (!messageIdsRef.current.has(row.message_id)) return;

        // Skip the current user's own receipt
        if (row.user_id === currentUserId) return;

        const receipt: ReadReceipt = {
          messageId: row.message_id,
          userId: row.user_id,
          readAt: row.read_at,
        };

        setReadReceiptMap((prev) => {
          const existing = prev[row.message_id] ?? [];
          // Avoid duplicate entries
          if (existing.some((r) => r.userId === row.user_id)) return prev;
          return {
            ...prev,
            [row.message_id]: [...existing, receipt],
          };
        });
      }
    );

    return () => {
      if (channelRef.current) {
        chatTransport.unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, currentUserId]);

  return { readReceiptMap };
}
