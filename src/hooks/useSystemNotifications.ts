import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SystemNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

type SystemNotificationReadRow = {
  notification_id: string;
  user_id: string;
};

export function useSystemNotifications(options?: { limit?: number; enabled?: boolean }) {
  const limit = options?.limit ?? 10;
  const enabled = options?.enabled ?? false;

  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!enabled || authLoading) return;

    if (!user) {
      setNotifications([]);
      setReadNotificationIds(new Set());
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);

      const { data: notifs, error: notifError } = await supabase
        .from('system_notifications')
        .select('id, title, message, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (notifError) throw notifError;

      const list = (notifs || []) as SystemNotification[];
      setNotifications(list);

      const ids = list.map((n) => n.id);
      if (ids.length === 0) {
        setReadNotificationIds(new Set());
        setUnreadCount(0);
        return;
      }

      const { data: reads, error: readsError } = await supabase
        .from('system_notification_reads')
        .select('notification_id, user_id')
        .eq('user_id', user.id)
        .in('notification_id', ids);

      if (readsError) throw readsError;

      const readIds = new Set<string>(((reads || []) as SystemNotificationReadRow[]).map((r) => r.notification_id));

      setReadNotificationIds(readIds);
      setUnreadCount(list.filter((n) => !readIds.has(n.id)).length);
    } catch (err) {
      console.warn('Erro ao carregar notificações do sistema:', err);
    } finally {
      setLoading(false);
    }
  }, [authLoading, enabled, limit, user]);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (!enabled || authLoading) return;
      if (!user) return;
      if (!ids.length) return;

      try {
        const payload = ids.map((id) => ({
          notification_id: id,
          user_id: user.id,
          read_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('system_notification_reads')
          // unique: (notification_id, user_id)
          .upsert(payload, { onConflict: 'notification_id,user_id' });

        if (error) throw error;

        const next = new Set<string>([...readNotificationIds]);
        ids.forEach((id) => next.add(id));
        setReadNotificationIds(next);
        setUnreadCount(notifications.filter((n) => !next.has(n.id)).length);
      } catch (err) {
        console.warn('Erro ao marcar notificações como lidas:', err);
      }
    },
    [authLoading, enabled, notifications, readNotificationIds, user]
  );

  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [enabled, refetch]);

  return {
    notifications,
    unreadCount,
    loading,
    readNotificationIds,
    refetch,
    markAsRead,
  };
}

