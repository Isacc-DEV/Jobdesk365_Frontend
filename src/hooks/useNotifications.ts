import { useCallback, useEffect, useMemo, useState } from "react";
import {
  notificationsService,
  type NotificationItem
} from "../services/notificationsService";

type UseNotificationsOptions = {
  pageSize?: number;
};

const mergeById = (items: NotificationItem[]) => {
  const map = new Map<string, NotificationItem>();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const pageSize = options.pageSize ?? 20;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async ({ cursor, append }: { cursor?: string | null; append?: boolean } = {}) => {
      const isAppend = Boolean(append && cursor);
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await notificationsService.list(pageSize, cursor ?? null);
        setItems((prev) =>
          isAppend ? mergeById([...prev, ...response.items]) : mergeById(response.items)
        );
        setNextCursor(response.next_cursor ?? null);
        setHasUnreadNotifications(Boolean(response.has_unread));
        setUnreadCount(Number(response.unread_count ?? 0));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const refreshNotifications = useCallback(async () => {
    await fetchPage();
  }, [fetchPage]);

  const loadMoreNotifications = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    await fetchPage({ cursor: nextCursor, append: true });
  }, [fetchPage, loadingMore, nextCursor]);

  const markAllAsRead = useCallback(async () => {
    await notificationsService.markAllRead();
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setHasUnreadNotifications(false);
    setUnreadCount(0);
    setError("");
  }, []);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [items]
  );

  return {
    items: sortedItems,
    nextCursor,
    hasUnreadNotifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    refreshNotifications,
    loadMoreNotifications,
    markAllAsRead
  };
};

