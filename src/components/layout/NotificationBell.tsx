import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";

type NotificationBellProps = {
  onNavigate?: (path: string) => void;
};

const getRelativeTime = (value: string) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diffSeconds = Math.floor((Date.now() - time) / 1000);
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
};

const NotificationBell = ({ onNavigate }: NotificationBellProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const {
    items,
    nextCursor,
    hasUnreadNotifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    refreshNotifications,
    loadMoreNotifications,
    markAllAsRead
  } = useNotifications({ pageSize: 20 });

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!rootRef.current || (target && rootRef.current.contains(target))) return;
      setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const onBellClick = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await refreshNotifications();
    }
  };

  const onNotificationClick = async (redirectUrl: string) => {
    try {
      await markAllAsRead();
    } catch {
      // Navigation should still proceed if mark-all-read fails.
    }
    setOpen(false);
    handleNavigate(redirectUrl);
  };

  const empty = !loading && items.length === 0;
  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return "";
    if (unreadCount === 1) return "1 unread";
    return `${unreadCount} unread`;
  }, [unreadCount]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onBellClick}
        className="relative h-[34px] w-[34px] grid place-items-center rounded-xl border border-border-soft bg-main text-ink transition duration-150 ease-out hover:border-ink-muted hover:-translate-y-[1px] hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
      >
        <Bell size={18} strokeWidth={1.8} />
        {hasUnreadNotifications ? (
          <span className="absolute right-[6px] top-[6px] h-2 w-2 rounded-full bg-red-500" />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-24px)] rounded-xl border border-border bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Notifications</p>
              {unreadLabel ? <p className="text-xs text-ink-muted">{unreadLabel}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="text-xs font-semibold text-accent-primary hover:underline"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto px-2 py-2">
            {loading ? (
              <p className="px-2 py-3 text-sm text-ink-muted">Loading notifications...</p>
            ) : empty ? (
              <p className="px-2 py-3 text-sm text-ink-muted">No notifications yet.</p>
            ) : (
              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => void onNotificationClick(item.redirect_url)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      item.is_read
                        ? "border-border bg-main hover:bg-slate-50"
                        : "border-sky-100 bg-sky-50/60 hover:bg-sky-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <span className="shrink-0 text-[11px] text-ink-muted">
                        {getRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2">{item.message}</p>
                  </button>
                ))}
              </div>
            )}

            {error ? <p className="px-2 py-2 text-xs text-red-600">{error}</p> : null}
          </div>

          {nextCursor ? (
            <div className="border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => void loadMoreNotifications()}
                disabled={loadingMore}
                className="w-full rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;

