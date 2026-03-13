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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedItem[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(item: QueuedItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineQueue(userId: string | undefined) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const isFlushing = useRef(false);

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

      // Sort oldest-first
      items.sort((a, b) => a.timestamp - b.timestamp);

      let sentCount = 0;
      for (const item of items) {
        try {
          if (item.kind === 'text') {
            await chatService.sendMessage(item.conversationId, item.content);
          } else {
            // Re-upload the stored binary
            const file = new File([item.data], item.fileName, { type: item.mimeType });
            const ext = item.fileName.split('.').pop();
            const path = `${item.conversationId}/${crypto.randomUUID()}.${ext}`;

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
          // Leave it in the queue for next flush
        }
      }

      if (sentCount > 0) {
        toast.success(`📤 ${sentCount} queued message${sentCount > 1 ? 's' : ''} sent`);
      }
    } finally {
      isFlushing.current = false;
      refreshCount();
    }
  }, [userId, refreshCount]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('🌐 Back online — sending queued messages…');
      flush();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📵 No internet — messages will be queued and sent when reconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
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

  // Enqueue a file (reads it into ArrayBuffer for storage)
  const enqueueFile = useCallback(async (conversationId: string, file: File, caption?: string) => {
    const data = await file.arrayBuffer();
    const item: QueuedFileMessage = {
      id: crypto.randomUUID(),
      kind: 'file',
      conversationId,
      fileName: file.name,
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
