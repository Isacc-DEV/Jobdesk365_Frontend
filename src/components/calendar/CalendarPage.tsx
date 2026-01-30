import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, RefreshCw } from "lucide-react";

const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "authToken";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const calendarPalette = [
  { dot: "bg-blue-500", tone: "bg-blue-100 text-blue-700" },
  { dot: "bg-teal-500", tone: "bg-teal-100 text-teal-700" },
  { dot: "bg-purple-500", tone: "bg-purple-100 text-purple-700" },
  { dot: "bg-amber-500", tone: "bg-amber-100 text-amber-700" },
  { dot: "bg-rose-500", tone: "bg-rose-100 text-rose-700" }
];

const formatMonthLabel = (date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const buildMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const formatEventTime = (start, end) => {
  if (!start && !end) return "";
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const startLabel = startDate
    ? startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const endLabel = endDate
    ? endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel || endLabel;
};

const normalizeAccount = (account, index) => {
  const palette = calendarPalette[index % calendarPalette.length];
  return {
    id: account.email_account_id,
    email: account.email_address || "Unknown",
    status: account.status || "",
    profileId: account.profile_id,
    profileName: account.profile_name || "",
    dot: palette.dot,
    tone: palette.tone
  };
};

const normalizeEvent = (event) => ({
  id: event.id,
  accountId: event.email_account_id,
  title: event.title || "Untitled",
  start: event.start_at,
  end: event.end_at
});

const CalendarPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState(null);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [activeView, setActiveView] = useState("Month");
  const [currentMonth] = useState(() => new Date());

  const { start: monthStart, end: monthEnd } = useMemo(
    () => buildMonthRange(currentMonth),
    [currentMonth]
  );

  const days = useMemo(() => Array.from({ length: 35 }, (_, index) => index + 1), []);

  const loadAccounts = useCallback(async (signal) => {
    const token = typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
    if (!token) {
      setAccountsError("Missing token");
      setAccounts([]);
      setAccountsLoading(false);
      return;
    }

    try {
      setAccountsLoading(true);
      setAccountsError(null);
      const res = await fetch(`${API_BASE}/calendar/accounts`, {
        signal,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load calendars (${res.status})`);
      }
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setAccounts(items.map((item, index) => normalizeAccount(item, index)).filter((item) => item.id));
    } catch (err) {
      if (err.name !== "AbortError") {
        setAccountsError(err.message || "Unable to load calendars.");
        setAccounts([]);
      }
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async (accountId, signal) => {
    if (!accountId) {
      setEvents([]);
      return;
    }
    const token = typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
    if (!token) {
      setEventsError("Missing token");
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    try {
      setEventsLoading(true);
      setEventsError(null);
      const res = await fetch(
        `${API_BASE}/calendar/events?account_id=${encodeURIComponent(accountId)}&start=${encodeURIComponent(monthStart.toISOString())}&end=${encodeURIComponent(monthEnd.toISOString())}`,
        {
          signal,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load events (${res.status})`);
      }
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setEvents(items.map(normalizeEvent));
    } catch (err) {
      if (err.name !== "AbortError") {
        setEventsError(err.message || "Unable to load events.");
        setEvents([]);
      }
    } finally {
      setEventsLoading(false);
    }
  }, [monthEnd, monthStart]);

  const syncEvents = useCallback(async (accountId) => {
    if (!accountId) return null;
    const token = typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
    if (!token) {
      setEventsError("Missing token");
      return null;
    }

    const res = await fetch(
      `${API_BASE}/calendar/sync?account_id=${encodeURIComponent(accountId)}&start=${encodeURIComponent(monthStart.toISOString())}&end=${encodeURIComponent(monthEnd.toISOString())}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      throw new Error(`Failed to sync calendar (${res.status})`);
    }
    return res.json();
  }, [monthEnd, monthStart]);

  useEffect(() => {
    const controller = new AbortController();
    loadAccounts(controller.signal);
    return () => controller.abort();
  }, [loadAccounts]);

  useEffect(() => {
    if (!accounts.length) {
      setActiveAccountId(null);
      return;
    }
    if (!activeAccountId || !accounts.some((account) => account.id === activeAccountId)) {
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  useEffect(() => {
    if (!activeAccountId) {
      setEvents([]);
      return;
    }
    const controller = new AbortController();
    loadEvents(activeAccountId, controller.signal);
    return () => controller.abort();
  }, [activeAccountId, loadEvents]);

  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0];
  const visibleEvents = events.filter((event) => event.accountId === activeAccount?.id);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    visibleEvents.forEach((event) => {
      if (!event.start) return;
      const date = new Date(event.start);
      if (Number.isNaN(date.getTime())) return;
      if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
        return;
      }
      const day = date.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(event);
    });
    return map;
  }, [visibleEvents, currentMonth]);

  const views = ["Month", "Week", "Day"];

  const handleConnectCalendar = () => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/profiles");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleSync = async () => {
    if (!activeAccountId) return;
    try {
      setEventsError(null);
      setEventsLoading(true);
      await syncEvents(activeAccountId);
      await loadAccounts();
      await loadEvents(activeAccountId);
    } catch (err) {
      setEventsError(err.message || "Unable to sync calendar.");
    } finally {
      setEventsLoading(false);
    }
  };

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <aside className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Calendars
            </div>
            <div className="mt-4 space-y-2">
              {accountsLoading ? (
                <div className="text-sm text-ink-muted">Loading calendars...</div>
              ) : accountsError ? (
                <div className="text-sm text-red-600">Couldn&apos;t load calendars.</div>
              ) : accounts.length === 0 ? (
                <div className="text-sm text-ink-muted">No calendars connected yet.</div>
              ) : (
                accounts.map((calendar) => {
                  const isActive = calendar.id === activeAccountId;
                  return (
                    <button
                      key={calendar.id}
                      type="button"
                      onClick={() => setActiveAccountId(calendar.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-accent-primary/10 text-accent-primary"
                          : "text-ink-muted hover:text-ink hover:bg-gray-100"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${calendar.dot}`} />
                      {calendar.email}
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={handleConnectCalendar}
              className="mt-4 w-full rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm font-semibold text-accent-primary hover:bg-white"
            >
              + Connect calendar
            </button>
          </aside>

          <section className="flex flex-col gap-4">
            <header>
              <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
              <p className="text-sm text-ink-muted">
                {activeAccount?.email || "No calendar selected"}
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-2">
              {views.map((view) => {
                const isActive = activeView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-accent-primary text-white"
                        : "bg-gray-100 text-ink-muted hover:text-ink"
                    }`}
                  >
                    {view}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center justify-between mb-4 text-xs text-ink-muted">
                <span className="flex items-center gap-2">
                  <Calendar size={14} />
                  {formatMonthLabel(currentMonth)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSync}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    <RefreshCw size={14} />
                    Sync
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
                  >
                    Select month
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-xs text-ink-muted mb-3">
                {weekDays.map((day) => (
                  <div key={day} className="px-2 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {eventsLoading ? (
                <div className="rounded-xl border border-border bg-gray-50 p-4 text-sm text-ink-muted">
                  Loading events...
                </div>
              ) : eventsError ? (
                <div className="rounded-xl border border-border bg-white p-4 text-sm text-red-600">
                  Couldn&apos;t load events.
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-3">
                  {days.map((day) => {
                    const dayEvents = eventsByDay.get(day) || [];
                    return (
                      <div
                        key={day}
                        className="min-h-[90px] rounded-xl border border-border/60 bg-gray-50/40 px-2 py-2"
                      >
                        <div className="text-xs text-ink-muted">{day <= 31 ? day : ""}</div>
                        <div className="mt-2 space-y-2">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${activeAccount?.tone || "bg-gray-100 text-ink"}`}
                            >
                              <div>{event.title}</div>
                              <div className="text-[11px] font-medium">
                                {formatEventTime(event.start, event.end)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CalendarPage;
