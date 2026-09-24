import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useDepartmentNotifications(department: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    // Initial fetch of unread count
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('target_department', department)
        .eq('read', false);

      if (count !== null) setUnreadCount(count);
    };

    fetchUnreadCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`dept_notif_${department}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `target_department=eq.${department}`,
        },
        () => {
          // Re-fetch count on any change to ensure accuracy
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [department, user]);

  return { unreadCount };
}
