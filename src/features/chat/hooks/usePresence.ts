import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '../stores/useChatStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** DB write throttle for “last seen” (presence sync can fire very often). */
const LAST_SEEN_PERSIST_MS = 120_000;

export function usePresence(userId: string | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncedKeysRef = useRef<string>('');

  const updateLastSeen = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() } as any)
      .eq('id', userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const pushOnlineIds = (ids: Set<string>) => {
      const signature = [...ids].sort().join('\0');
      if (signature === lastSyncedKeysRef.current) return;
      lastSyncedKeysRef.current = signature;
      useChatStore.getState().setOnlineUserIds(ids);
    };

    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set(Object.keys(state));
        pushOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    void updateLastSeen();
    intervalRef.current = setInterval(updateLastSeen, LAST_SEEN_PERSIST_MS);

    const handleBeforeUnload = () => {
      void updateLastSeen();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      lastSyncedKeysRef.current = '';
      useChatStore.getState().setOnlineUserIds(new Set());
    };
    // Intentionally omit setOnlineUserIds: use getState() so Zustand identity changes cannot
    // re-run this effect. Presence “sync” storms were retriggering deps and spamming PATCH profiles.
  }, [userId, updateLastSeen]);
}
