import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Custom hook for real-time support ticket updates via Supabase Realtime.
 * Subscribes to support_tickets and support_messages tables.
 */

interface RealtimeEvent {
  type: 'ticket_new' | 'ticket_updated' | 'message_new';
  payload: any;
  timestamp: string;
}

export function useSupportRealtime(options?: {
  onNewTicket?: (ticket: any) => void;
  onTicketUpdated?: (ticket: any) => void;
  onNewMessage?: (message: any) => void;
}) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  const addEvent = useCallback((event: RealtimeEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 events
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('support-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload: any) => {
          const event: RealtimeEvent = {
            type: 'ticket_new',
            payload: payload.new,
            timestamp: new Date().toISOString(),
          };
          addEvent(event);
          options?.onNewTicket?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload: any) => {
          const event: RealtimeEvent = {
            type: 'ticket_updated',
            payload: payload.new,
            timestamp: new Date().toISOString(),
          };
          addEvent(event);
          options?.onTicketUpdated?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload: any) => {
          const event: RealtimeEvent = {
            type: 'message_new',
            payload: payload.new,
            timestamp: new Date().toISOString(),
          };
          addEvent(event);
          options?.onNewMessage?.(payload.new);
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Intentionally stable — options are refs

  return { events, isConnected };
}
