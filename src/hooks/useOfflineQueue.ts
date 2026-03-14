import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { chatService } from '@/services/chat.service';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────

export type QueuedTextMessage = {
  id: string;
  kind: 'text';
  conversationId: string;
  content: string;
  timestamp: number;
};

export type QueuedFileMessage = {
  id: string;
  kind: 'file';
  conversationId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  data: ArrayBuffer; // stored in IndexedDB
  caption?: string;
  timestamp: number;
};

export type QueuedItem = QueuedTextMessage | QueuedFileMessage;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Sanitize file name for storage path: no path traversal, only safe chars. */
function sanitizeFileName(name: string): string {
  const basename = name.replace(/^.*[/\\]/, '');
  const safe = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe || 'file';
}

// ── IndexedDB helpers ──────────────────────────────────────────────────────

const DB_NAME = 'openplan_offline_queue';
const DB_VERSION = 1;
const STORE = 'queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(): Promise<QueuedItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as QueuedItem[]);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] dbGetAll failed:', err);
    return [];
  }
}

async function dbPut(item: QueuedItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] dbPut failed:', err);
    throw err;
  }
}

async function dbDelete(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
    });
  } catch (err) {
    console.error('[OfflineQueue] dbDelete failed', id, err);
    throw err;
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineQueue(userId: string | undefined) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const isFlushing = useRef(false);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh count from DB
  const refreshCount = useCallback(async () => {
    const items = await dbGetAll();
    setPendingCount(items.length);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Flush the queue – send all pending items in order
  const flush = useCallback(async () => {
    if (isFlushing.current || !userId) return;
    isFlushing.current = true;

    try {
      const items = await dbGetAll();
      if (items.length === 0) return;

      const validItems = items.filter(
        (item) => typeof item.timestamp === 'number' && !Number.isNaN(item.timestamp)
      );
      if (validItems.length !== items.length) {
        console.warn('[OfflineQueue] Some items had invalid timestamps and were skipped');
      }
      validItems.sort((a, b) => a.timestamp - b.timestamp);

      let sentCount = 0;
      let failedCount = 0;

      for (const item of validItems) {
        try {
          if (item.kind === 'text') {
            await chatService.sendMessage(item.conversationId, item.content);
          } else {
            const safeName = sanitizeFileName(item.fileName);
            const ext = safeName.split('.').pop() || 'bin';
            const path = `${item.conversationId}/${crypto.randomUUID()}.${ext}`;
            const file = new File([item.data], safeName, { type: item.mimeType });

            const { error: uploadErr } = await supabase.storage
              .from('chat-attachments')
              .upload(path, file);
            if (uploadErr) throw uploadErr;

            const { data: urlData } = supabase.storage
              .from('chat-attachments')
              .getPublicUrl(path);

            const content = JSON.stringify({
              fileName: item.fileName,
              fileSize: item.fileSize,
              mimeType: item.mimeType,
              url: urlData.publicUrl,
              text: item.caption || undefined,
            });

            const { error } = await supabase
              .from('chat_messages')
              .insert({
                conversation_id: item.conversationId,
                sender_id: userId,
                content,
                content_type: 'file',
              });
            if (error) throw error;
          }

          await dbDelete(item.id);
          sentCount++;
        } catch (err) {
          console.error('[OfflineQueue] Failed to send queued item', item.id, err);
          failedCount++;
        }
      }

      if (sentCount > 0) {
        toast.success(`📤 ${sentCount} queued message${sentCount > 1 ? 's' : ''} sent`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} message(s) could not be sent after retries. They remain in the queue.`);
      }
    } finally {
      isFlushing.current = false;
      refreshCount();
    }
  }, [userId, refreshCount]);

  // Online / offline listeners (debounce flush to avoid rapid repeated calls)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('🌐 Back online — sending queued messages…');
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = setTimeout(() => {
        flushTimeoutRef.current = null;
        flush();
      }, 300);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📵 No internet — messages will be queued and sent when reconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flush]);

  // Enqueue a text message
  const enqueueText = useCallback(async (conversationId: string, content: string) => {
    const item: QueuedTextMessage = {
      id: crypto.randomUUID(),
      kind: 'text',
      conversationId,
      content,
      timestamp: Date.now(),
    };
    await dbPut(item);
    refreshCount();
  }, [refreshCount]);

  // Enqueue a file (reads it into ArrayBuffer for storage; sanitized filename)
  const enqueueFile = useCallback(async (conversationId: string, file: File, caption?: string) => {
    const data = await file.arrayBuffer();
    const item: QueuedFileMessage = {
      id: crypto.randomUUID(),
      kind: 'file',
      conversationId,
      fileName: sanitizeFileName(file.name),
      fileSize: file.size,
      mimeType: file.type,
      data,
      caption,
      timestamp: Date.now(),
    };
    await dbPut(item);
    refreshCount();
  }, [refreshCount]);

  return { isOnline, pendingCount, enqueueText, enqueueFile, flush };
}
