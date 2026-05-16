import { useState, useEffect, useCallback } from 'react';
import { Log } from 'logging_middleware';
import {
  Notification,
  fetchNotifications,
  fetchPriorityNotifications,
  markNotificationRead as apiMarkRead,
  fetchUnreadCount,
} from '../api/notifications';

export function useNotifications(initialLimit = 20) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Log('frontend', 'info', 'hook', `Loading notifications page=${page}, type=${typeFilter}`);
      const data = await fetchNotifications({
        limit: initialLimit,
        page,
        notification_type: typeFilter || undefined,
      });
      setNotifications(data.notifications || []);
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await Log('frontend', 'error', 'hook', `Failed to load notifications: ${msg}`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, initialLimit]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    await Log('frontend', 'info', 'hook', `Marking ${id} read`);
    await apiMarkRead(id);
    setReadIds((prev) => new Set([...prev, id]));
    setNotifications((prev) =>
      prev.map((n) => (n.ID === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const addNotification = useCallback(async (n: Notification) => {
    await Log('frontend', 'info', 'hook', `Real-time notification received: ${n.ID}`);
    setNotifications((prev) => [n, ...prev]);
    setUnreadCount((c) => c + 1);
  }, []);

  return {
    notifications,
    loading,
    error,
    page,
    setPage,
    typeFilter,
    setTypeFilter,
    unreadCount,
    readIds,
    markRead,
    reload: load,
    addNotification,
  };
}

export function usePriorityNotifications(initialN = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(initialN);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Log('frontend', 'info', 'hook', `Loading priority notifications n=${n}`);
      const data = await fetchPriorityNotifications(n);
      let items = data.notifications || [];
      if (typeFilter) {
        items = items.filter((item) => item.Type === typeFilter);
      }
      setNotifications(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await Log('frontend', 'error', 'hook', `Failed to load priority notifications: ${msg}`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [n, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return { notifications, loading, error, n, setN, typeFilter, setTypeFilter, reload: load };
}
