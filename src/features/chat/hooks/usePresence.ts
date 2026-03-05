import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '../stores/useChatStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function usePresence(userId: string | undefined) {
  const setOnlineUserIds = useChatStore((s) => s.setOnlineUserIds);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateLastSeen = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() } as any)
      .eq('id', userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set(Object.keys(state));
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // Update last_seen periodically
    updateLastSeen();
    intervalRef.current = setInterval(updateLastSeen, 60000);

    const handleBeforeUnload = () => {
      updateLastSeen();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      setOnlineUserIds(new Set());
    };
  }, [userId, updateLastSeen, setOnlineUserIds]);
}
