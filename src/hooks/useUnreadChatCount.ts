// src/hooks/useUnreadChatCount.ts
// Polls the get_unread_chat_count RPC every 30 seconds
// and updates via Supabase Realtime when new messages arrive in any of the user's conversations.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUnreadChatCount(userId: string | undefined) {
  const [count, setCount] = useState(0);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc('get_unread_chat_count', {
        p_user_id: userId,
      });
      if (!error && typeof data === 'number') setCount(data);
    } catch {
      // Silent fail — badge simply stays at last known value
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (!userId) return;

    fetchCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30_000);

    // Also subscribe to realtime inserts on chat_messages to bump immediately
    const channel = supabase
      .channel(`unread_count_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          // Re-fetch count on any new message (RPC handles the membership filter)
          fetchCount();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchCount, supabase]);

  return count;
}
