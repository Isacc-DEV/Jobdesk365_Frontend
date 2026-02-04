import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";
import HireRequestModal from "../hire/HireRequestModal";
import { requestsService } from "../../services/requestsService";
import { useUser } from "../../hooks/useUser";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const monthShort = monthLabels.map((label) => label.slice(0, 3));

const calendarPalette = [
  { dot: "bg-blue-500", tone: "bg-blue-100 text-blue-700", text: "text-blue-500" },
  { dot: "bg-teal-500", tone: "bg-teal-100 text-teal-700", text: "text-teal-500" },
  { dot: "bg-purple-500", tone: "bg-purple-100 text-purple-700", text: "text-purple-500" },
  { dot: "bg-amber-500", tone: "bg-amber-100 text-amber-700", text: "text-amber-500" },
  { dot: "bg-rose-500", tone: "bg-rose-100 text-rose-700", text: "text-rose-500" }
];

const callerConflictAlert =
  "that caller already scheduled in that time. If u can't select other caller or u can't reschedule that meeting, plz contact support team";

const formatMonthLabel = (date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getWeekStart = (date) => {
  const base = startOfDay(date);
  const day = base.getDay();
  const offset = (day + 6) % 7;
  return addDays(base, -offset);
};

const buildViewRange = (date, view) => {
  if (view === "Week") {
    const start = getWeekStart(date);
    return { start, end: addDays(start, 7) };
  }
  if (view === "Day") {
    const start = startOfDay(date);
    return { start, end: addDays(start, 1) };
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const hasCallerConflict = (requests, assigneeId, start, end) => {
  if (!assigneeId || !start) return false;
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return false;
  const endMs = end ? new Date(end).getTime() : startMs;
  const bufferStart = startMs - 15 * 60 * 1000;
  const bufferEnd = endMs + 15 * 60 * 1000;

  return requests.some((request) => {
    if (request?.role !== "caller") return false;
    if (request?.status === "closed") return false;
    if (String(request?.assignee_user_id) !== String(assigneeId)) return false;
    if (!request?.when_at) return false;
    const requestMs = new Date(request.when_at).getTime();
    if (Number.isNaN(requestMs)) return false;
    return requestMs >= bufferStart && requestMs <= bufferEnd;
  });
};

const toLocalDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const normalizeAccount = (account, index) => {
  const palette = calendarPalette[index % calendarPalette.length];
  const ownerUsername =
    account.owner_username || account.owner_display_name || account.owner_email || "";
  return {
    id: account.email_account_id,
    email: account.email_address || "Unknown",
    status: account.status || "",
    profileId: account.profile_id,
    profileName: account.profile_name || "",
    ownerUsername,
    dot: palette.dot,
    tone: palette.tone,
    text: palette.text
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
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin") || roles.includes("manager");
  const monthPickerRef = useRef(null);
  const monthButtonRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState(null);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [activeView, setActiveView] = useState("Month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [callerModalOpen, setCallerModalOpen] = useState(false);
  const [callerList, setCallerList] = useState([]);
  const [callerLoading, setCallerLoading] = useState(false);
  const [callerSubmitting, setCallerSubmitting] = useState(false);
  const [callerError, setCallerError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [callerMode, setCallerMode] = useState("request");

  const currentMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    [currentDate]
  );

  const { start: viewStart, end: viewEnd } = useMemo(
    () => buildViewRange(currentDate, activeView),
    [currentDate, activeView]
  );

  const monthCells = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [currentDate]);

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
        `${API_BASE}/calendar/events?account_id=${encodeURIComponent(accountId)}&start=${encodeURIComponent(viewStart.toISOString())}&end=${encodeURIComponent(viewEnd.toISOString())}`,
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
  }, [viewEnd, viewStart]);

  const loadCallers = useCallback(async () => {
    try {
      setCallerLoading(true);
      setCallerError("");
      const items = await requestsService.listTalents("caller");
      setCallerList(items);
    } catch (err) {
      setCallerError(err?.message || "Unable to load callers.");
    } finally {
      setCallerLoading(false);
    }
  }, []);

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
      `${API_BASE}/calendar/sync?account_id=${encodeURIComponent(accountId)}&start=${encodeURIComponent(viewStart.toISOString())}&end=${encodeURIComponent(viewEnd.toISOString())}`,
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
  }, [viewEnd, viewStart]);

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

  useEffect(() => {
    if (!callerModalOpen) return;
    loadCallers();
  }, [callerModalOpen, loadCallers]);

  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0];
  const activeAccountLabel = activeAccount
    ? [activeAccount.profileName, activeAccount.ownerUsername]
        .filter(Boolean)
        .join(" · ")
    : "";
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

  const eventsByDate = useMemo(() => {
    const map = new Map();
    visibleEvents.forEach((event) => {
      if (!event.start) return;
      const date = new Date(event.start);
      if (Number.isNaN(date.getTime())) return;
      const key = toDateKey(date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [visibleEvents]);

  const viewLabel = useMemo(() => {
    if (activeView === "Week") {
      const start = getWeekStart(currentDate);
      const end = addDays(start, 6);
      const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startLabel} - ${endLabel}`;
    }
    if (activeView === "Day") {
      return currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    return formatMonthLabel(currentDate);
  }, [activeView, currentDate]);

  const shiftDate = (direction) => {
    const delta = direction === "next" ? 1 : -1;
    if (activeView === "Week") {
      setCurrentDate((prev) => addDays(prev, delta * 7));
      return;
    }
    if (activeView === "Day") {
      setCurrentDate((prev) => addDays(prev, delta));
      return;
    }
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleMonthSelect = (monthIndex) => {
    setCurrentDate(new Date(pickerYear, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  useEffect(() => {
    setPickerYear(currentDate.getFullYear());
  }, [currentDate]);

  useEffect(() => {
    if (!isMonthPickerOpen) return;
    const handleOutside = (event) => {
      const target = event.target;
      if (!target) return;
      if (
        monthPickerRef.current?.contains(target) ||
        monthButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsMonthPickerOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMonthPickerOpen]);

  const weekDates = useMemo(() => {
    if (activeView !== "Week") return [];
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [activeView, currentDate]);

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

  const handleEventRequest = (event) => {
    setSelectedEvent(event);
    setCallerError("");
    setCallerMode(isAdmin ? "assign" : "request");
    setCallerModalOpen(true);
  };

  const closeCallerModal = () => {
    if (callerSubmitting) return;
    setCallerModalOpen(false);
    setCallerError("");
    setSelectedEvent(null);
    setCallerMode("request");
  };

  const handleCallerSubmit = async ({ assigneeId, whenAt, jobUrl, meetingUrl, otherNotes }) => {
    try {
      setCallerSubmitting(true);
      setCallerError("");
      if (callerMode === "assign") {
        if (!selectedEvent?.id) return;
        const confirmed = window.confirm(
          `Assign this caller to "${selectedEvent.title || "event"}"?`
        );
        if (!confirmed) return;
        const token = typeof window !== "undefined"
          ? window.localStorage.getItem(TOKEN_KEY)
          : null;
        if (!token) throw new Error("Missing token");
        const res = await fetch(`${API_BASE}/calendar/events/${selectedEvent.id}/assign`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ assignee_user_id: assigneeId })
        });
        if (res.status === 401 && typeof window !== "undefined") {
          window.location.href = "/auth";
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Unable to assign caller.");
        }
        setCallerModalOpen(false);
        setSelectedEvent(null);
      } else {
        const existingRequests = (await requestsService.listRequests()) || [];
        const conflict = hasCallerConflict(
          existingRequests,
          assigneeId,
          selectedEvent?.start,
          selectedEvent?.end
        );
        if (conflict) {
          window.alert(callerConflictAlert);
          return;
        }
        await requestsService.createRequest({
          role: "caller",
          detail: {
            job_url: jobUrl || "",
            meeting_url: meetingUrl || "",
            other: otherNotes || ""
          },
          assignee_user_id: assigneeId,
          when_at: whenAt
        });
        setCallerModalOpen(false);
        setSelectedEvent(null);
      }
    } catch (err) {
      const fallback =
        callerMode === "assign" ? "Unable to assign caller." : "Unable to send request.";
      setCallerError(err?.message || fallback);
    } finally {
      setCallerSubmitting(false);
    }
  };

  return (
    <main className=" min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <aside className="border border-border bg-white p-4 shadow-sm">
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
                      className={`w-full min-w-0 flex items-start gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-accent-primary/10 text-accent-primary"
                          : "text-ink-muted hover:text-ink hover:bg-gray-100"
                      }`}
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${calendar.dot}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className={`block truncate ${calendar.text}`}>{calendar.email}</span>
                        {calendar.profileName || calendar.ownerUsername ? (
                          <span className="mt-1 block truncate text-xs font-medium text-ink-muted">
                            {[calendar.profileName, calendar.ownerUsername].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </span>
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

          <section className="flex flex-col gap-4 border border-border bg-white p-4 ">
            <header>
              <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
              <p className="text-sm text-ink-muted">
                {activeAccount?.email || "No calendar selected"}
              </p>
              {activeAccountLabel ? (
                <p className="text-xs text-ink-muted">{activeAccountLabel}</p>
              ) : null}
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
                  {viewLabel}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftDate("prev")}
                    className="flex items-center justify-center rounded-lg border border-border px-2 py-1.5 text-xs text-ink-muted hover:text-ink"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftDate("next")}
                    className="flex items-center justify-center rounded-lg border border-border px-2 py-1.5 text-xs text-ink-muted hover:text-ink"
                    aria-label="Next"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSync}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    <RefreshCw size={14} />
                    Sync
                  </button>
                  <div className="relative">
                    <button
                      ref={monthButtonRef}
                      type="button"
                      onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                      className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
                      aria-haspopup="dialog"
                      aria-expanded={isMonthPickerOpen}
                    >
                      Select month
                      <ChevronDown size={14} />
                    </button>
                    {isMonthPickerOpen ? (
                      <div
                        ref={monthPickerRef}
                        className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-white shadow-lg"
                        role="dialog"
                        aria-label="Select month"
                      >
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setPickerYear((prev) => prev - 1)}
                            className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink"
                            aria-label="Previous year"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-sm font-semibold text-ink">{pickerYear}</span>
                          <button
                            type="button"
                            onClick={() => setPickerYear((prev) => prev + 1)}
                            className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink"
                            aria-label="Next year"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-3">
                          {monthShort.map((label, index) => {
                            const isActive =
                              pickerYear === currentDate.getFullYear() &&
                              index === currentDate.getMonth();
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => handleMonthSelect(index)}
                                className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                                  isActive
                                    ? "bg-accent-primary text-white"
                                    : "bg-gray-50 text-ink-muted hover:text-ink hover:bg-gray-100"
                                }`}
                                aria-label={monthLabels[index]}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              setPickerYear(now.getFullYear());
                              setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                              setIsMonthPickerOpen(false);
                            }}
                            className="text-ink-muted hover:text-ink"
                          >
                            This month
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsMonthPickerOpen(false)}
                            className="text-ink-muted hover:text-ink"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
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
                <>
                  {activeView === "Month" ? (
                    <>
                      <div className="grid grid-cols-7 text-xs text-ink-muted mb-3">
                        {weekDays.map((day) => (
                          <div key={day} className="px-2 py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-3">
                        {monthCells.map((day, index) => {
                          const dayEvents = day ? eventsByDay.get(day) || [] : [];
                          return (
                            <div
                              key={`${day ?? "empty"}-${index}`}
                              role={day ? "button" : undefined}
                              tabIndex={day ? 0 : -1}
                              onClick={() => {
                                if (!day) return;
                                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                              }}
                              onKeyDown={(event) => {
                                if (!day) return;
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                                }
                              }}
                              className={`min-h-[90px] rounded-xl border border-border/60 px-2 py-2 text-left transition-colors ${
                                day ? "bg-gray-50/40 hover:bg-gray-50 cursor-pointer" : "bg-transparent"
                              }`}
                            >
                              <div className="text-xs text-ink-muted">{day ?? ""}</div>
                              <div className="mt-2 space-y-2">
                                {dayEvents.map((event) => (
                                  <button
                                    key={event.id}
                                    type="button"
                                    onClick={(clickEvent) => {
                                      clickEvent.stopPropagation();
                                      handleEventRequest(event);
                                    }}
                                    className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${activeAccount?.tone || "bg-gray-100 text-ink"}`}
                                  >
                                    <div>{event.title}</div>
                                    <div className="text-[11px] font-medium">
                                      {formatEventTime(event.start, event.end)}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : activeView === "Week" ? (
                    <>
                      <div className="grid grid-cols-7 text-xs text-ink-muted mb-3">
                        {weekDates.map((date) => (
                          <div key={toDateKey(date)} className="px-2 py-1">
                            {weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1]} {date.getDate()}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-3">
                        {weekDates.map((date) => {
                          const key = toDateKey(date);
                          const dayEvents = eventsByDate.get(key) || [];
                          return (
                            <div
                              key={key}
                              className="min-h-[120px] rounded-xl border border-border/60 bg-gray-50/40 px-2 py-2"
                            >
                              <div className="text-xs text-ink-muted">{date.getDate()}</div>
                              <div className="mt-2 space-y-2">
                                {dayEvents.map((event) => (
                                  <button
                                    key={event.id}
                                    type="button"
                                    onClick={() => handleEventRequest(event)}
                                    className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${activeAccount?.tone || "bg-gray-100 text-ink"}`}
                                  >
                                    <div>{event.title}</div>
                                    <div className="text-[11px] font-medium">
                                      {formatEventTime(event.start, event.end)}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      {(eventsByDate.get(toDateKey(currentDate)) || []).length === 0 ? (
                        <div className="rounded-xl border border-border bg-gray-50 p-4 text-sm text-ink-muted">
                          No events for this day.
                        </div>
                      ) : (
                        (eventsByDate.get(toDateKey(currentDate)) || []).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => handleEventRequest(event)}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${activeAccount?.tone || "bg-gray-100 text-ink"}`}
                          >
                            <div>{event.title}</div>
                            <div className="text-xs font-medium">
                              {formatEventTime(event.start, event.end)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
      <HireRequestModal
        open={callerModalOpen}
        title={callerMode === "assign" ? "Assign caller" : "Request caller"}
        roleLabel="Caller"
        rateLabel="Hourly rate"
        showDetail={false}
        showJobUrl={callerMode !== "assign"}
        showMeetingUrl={callerMode !== "assign"}
        showOtherNotes={callerMode !== "assign"}
        showWhen={callerMode !== "assign"}
        people={callerList}
        loading={callerLoading}
        submitting={callerSubmitting}
        initialWhen={toLocalDateTimeInput(selectedEvent?.start)}
        error={callerError}
        onClose={closeCallerModal}
        onSubmit={handleCallerSubmit}
        submitLabel={callerMode === "assign" ? "Assign caller" : "Send request"}
        submittingLabel={callerMode === "assign" ? "Assigning..." : "Sending..."}
      />
    </main>
  );
};

export default CalendarPage;
