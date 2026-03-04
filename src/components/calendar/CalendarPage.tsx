import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";
import HireRequestModal from "../hire/HireRequestModal";
import Modal from "../common/Modal";
import { requestsService } from "../../services/requestsService";
import { useUser } from "../../hooks/useUser";
import {
  getCalendarEndpointPathByRoles,
  getProfilesEndpointPathByRoles,
  getProfilesRouteByRoles
} from "../../lib/profilesAccess";

type CalendarAccount = {
  id: string;
  email: string;
  status: string;
  profileName: string;
  ownerUsername: string;
  dot: string;
  text: string;
  eventBg: string;
  eventBorder: string;
  eventText: string;
};

type CallStatus = "unassigned" | "pending" | "assigned" | "rejected";

type CalendarEventItem = {
  id: string;
  source: "outlook" | "manual";
  accountId: string | null;
  title: string;
  start: string;
  end: string;
  ownerUserId?: string | null;
  profileId?: string | null;
  profileName?: string | null;
  note?: string | null;
  manualEventId?: string | null;
  requestedCallerUserId?: string | null;
  callerRequestId?: string | null;
  callStatus?: CallStatus;
  requestStatus?: "pending" | "working" | "closed" | null;
};

type ManualFormState = {
  id: string | null;
  ownerUserId: string | null;
  title: string;
  startAt: string;
  endAt: string;
  profileId: string;
  callerUserId: string;
  note: string;
  callStatus: CallStatus;
  requestStatus: "pending" | "working" | "closed" | null;
  callerRequestId: string | null;
};

type OwnerOption = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
};

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
  { dot: "bg-blue-500", text: "text-blue-500", eventBg: "#dbeafe", eventBorder: "#93c5fd", eventText: "#1d4ed8" },
  { dot: "bg-teal-500", text: "text-teal-500", eventBg: "#ccfbf1", eventBorder: "#5eead4", eventText: "#0f766e" },
  { dot: "bg-purple-500", text: "text-purple-500", eventBg: "#ede9fe", eventBorder: "#c4b5fd", eventText: "#6d28d9" },
  { dot: "bg-amber-500", text: "text-amber-500", eventBg: "#fef3c7", eventBorder: "#fcd34d", eventText: "#92400e" },
  { dot: "bg-rose-500", text: "text-rose-500", eventBg: "#ffe4e6", eventBorder: "#fda4af", eventText: "#be123c" }
];

const manualPendingTone = { eventBg: "#fff7ed", eventBorder: "#f97316", eventText: "#9a3412" };
const manualAssignedTone = { eventBg: "#dcfce7", eventBorder: "#16a34a", eventText: "#166534" };

const callerConflictAlert =
  "that caller already scheduled in that time. If u can't select other caller or u can't reschedule that meeting, plz contact support team";

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);

const getWeekStart = (date: Date) => {
  const base = startOfDay(date);
  const day = base.getDay();
  const offset = (day + 6) % 7;
  return addDays(base, -offset);
};

const buildViewRange = (date: Date, view: string) => {
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

const toLocalDateTimeInput = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toIsoFromLocalDateTime = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const mapCallStatus = (raw: any): CallStatus => {
  const requestStatus = String(raw?.request_status || "").toLowerCase();
  if (requestStatus === "working") return "assigned";
  if (requestStatus === "closed") return "rejected";
  if (requestStatus === "pending") return "pending";
  const next = String(raw?.call_status || "").toLowerCase();
  if (next === "pending" || next === "assigned" || next === "rejected") return next;
  return "unassigned";
};

const normalizeAccount = (account: any, index: number): CalendarAccount => {
  const palette = calendarPalette[index % calendarPalette.length];
  const ownerUsername =
    account.owner_username || account.owner_display_name || account.owner_email || "";
  return {
    id: account.email_account_id,
    email: account.email_address || "Unknown",
    status: account.status || "",
    profileName: account.profile_name || "",
    ownerUsername,
    dot: palette.dot,
    text: palette.text,
    eventBg: palette.eventBg,
    eventBorder: palette.eventBorder,
    eventText: palette.eventText
  };
};

const normalizeEvent = (event: any): CalendarEventItem => {
  const source = event?.source === "manual" ? "manual" : "outlook";
  if (source === "manual") {
    return {
      id: event.manual_event_id || event.id,
      manualEventId: event.manual_event_id || event.id,
      source: "manual",
      accountId: null,
      title: event.title || "Untitled",
      start: event.start_at,
      end: event.end_at,
      ownerUserId: event.owner_user_id || null,
      profileId: event.profile_id || null,
      profileName: event.profile_name || null,
      note: event.note || "",
      requestedCallerUserId: event.requested_caller_user_id || null,
      callerRequestId: event.caller_request_id || null,
      callStatus: mapCallStatus(event),
      requestStatus: event.request_status || null
    };
  }
  return {
    id: event.id,
    source: "outlook",
    accountId: event.email_account_id,
    title: event.title || "Untitled",
    start: event.start_at,
    end: event.end_at
  };
};

const viewToFullCalendar = (view: string) => {
  if (view === "Week") return "timeGridWeek";
  if (view === "Day") return "timeGridDay";
  return "dayGridMonth";
};

const CalendarPage = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const badges = Array.isArray(user?.badges) ? user.badges : [];
  const isAdmin = roles.includes("admin") || roles.includes("manager");
  const assignedOnlyMode = !isAdmin;
  const profilesRoute = getProfilesRouteByRoles(roles, badges);
  const profilesEndpointPath = getProfilesEndpointPathByRoles(roles, badges);
  const calendarEndpointPath = getCalendarEndpointPathByRoles(roles, badges);
  const profilesEndpoint = API_BASE ? `${API_BASE}${profilesEndpointPath}` : profilesEndpointPath;
  const calendarEndpoint = API_BASE ? `${API_BASE}${calendarEndpointPath}` : calendarEndpointPath;
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const monthButtonRef = useRef<HTMLButtonElement | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const skipDateClickRef = useRef(false);
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("Month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [callerModalOpen, setCallerModalOpen] = useState(false);
  const [callerList, setCallerList] = useState<any[]>([]);
  const [callerLoading, setCallerLoading] = useState(false);
  const [callerSubmitting, setCallerSubmitting] = useState(false);
  const [callerError, setCallerError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [callerMode, setCallerMode] = useState("request");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualDecisionSubmitting, setManualDecisionSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [profileOptions, setProfileOptions] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [manualForm, setManualForm] = useState<ManualFormState>({
    id: null,
    ownerUserId: null,
    title: "",
    startAt: "",
    endAt: "",
    profileId: "",
    callerUserId: "",
    note: "",
    callStatus: "unassigned",
    requestStatus: null,
    callerRequestId: null
  });

  const { start: viewStart, end: viewEnd } = useMemo(
    () => buildViewRange(currentDate, activeView),
    [currentDate, activeView]
  );

  const fetchWithToken = useCallback(async (url: string, init?: RequestInit) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) throw new Error("Missing token");
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {})
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    return res;
  }, []);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    try {
      setAccountsLoading(true);
      setAccountsError(null);
      const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (!token) throw new Error("Missing token");
      const res = await fetch(`${calendarEndpoint}/accounts`, {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) throw new Error(`Failed to load calendars (${res.status})`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setAccounts(items.map((item, index) => normalizeAccount(item, index)).filter((item) => item.id));
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setAccountsError(err?.message || "Unable to load calendars.");
        setAccounts([]);
      }
    } finally {
      setAccountsLoading(false);
    }
  }, [calendarEndpoint]);

  const loadEvents = useCallback(async (accountId?: string | null, signal?: AbortSignal) => {
    try {
      setEventsLoading(true);
      setEventsError(null);
      const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (!token) throw new Error("Missing token");
      const query = new URLSearchParams({
        start: viewStart.toISOString(),
        end: viewEnd.toISOString()
      });
      if (accountId) query.set("account_id", accountId);
      if (assignedOnlyMode) query.set("assigned_only", "1");
      const res = await fetch(`${calendarEndpoint}/events?${query.toString()}`, {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setEvents(items.map(normalizeEvent));
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setEventsError(err?.message || "Unable to load events.");
        setEvents([]);
      }
    } finally {
      setEventsLoading(false);
    }
  }, [assignedOnlyMode, calendarEndpoint, viewEnd, viewStart]);

  const loadCallers = useCallback(async () => {
    try {
      setCallerLoading(true);
      setCallerError("");
      const items = await requestsService.listTalents("caller", { roles });
      setCallerList(items);
    } catch (err: any) {
      setCallerError(err?.message || "Unable to load callers.");
    } finally {
      setCallerLoading(false);
    }
  }, [roles]);

  const loadProfiles = useCallback(async () => {
    try {
      setProfileLoading(true);
      setProfileError("");
      const res = await fetchWithToken(`${profilesEndpoint}?limit=200`);
      if (!res) return;
      if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setProfileOptions(items);
    } catch (err: any) {
      setProfileError(err?.message || "Unable to load profiles.");
      setProfileOptions([]);
    } finally {
      setProfileLoading(false);
    }
  }, [fetchWithToken, profilesEndpoint]);

  const loadOwners = useCallback(async () => {
    if (!isAdmin) {
      setOwnerOptions([]);
      return;
    }
    try {
      setOwnerLoading(true);
      setOwnerError("");
      const items = await requestsService.searchUsers("", { roles, context: "profile_owner" });
      const mapped = Array.isArray(items)
        ? items.map((item: any) => ({
            id: String(item.id || ""),
            username: item.username || null,
            display_name: item.display_name || null,
            email: item.email || null
          }))
        : [];
      setOwnerOptions(mapped.filter((item) => item.id));
    } catch (err: any) {
      setOwnerError(err?.message || "Unable to load users.");
      setOwnerOptions([]);
    } finally {
      setOwnerLoading(false);
    }
  }, [isAdmin, roles]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAccounts(controller.signal);
    return () => controller.abort();
  }, [loadAccounts]);

  useEffect(() => {
    if (!accounts.length) {
      setActiveAccountId(null);
      return;
    }
    if (!activeAccountId || !accounts.some((item) => item.id === activeAccountId)) {
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(activeAccountId, controller.signal);
    return () => controller.abort();
  }, [activeAccountId, loadEvents]);

  useEffect(() => {
    if (!callerModalOpen && !manualModalOpen) return;
    void loadCallers();
  }, [callerModalOpen, manualModalOpen, loadCallers]);

  useEffect(() => {
    if (!manualModalOpen) return;
    void loadProfiles();
  }, [manualModalOpen, loadProfiles]);

  useEffect(() => {
    if (!manualModalOpen || !isAdmin || !!manualForm.id) return;
    void loadOwners();
  }, [isAdmin, loadOwners, manualForm.id, manualModalOpen]);

  useEffect(() => {
    setPickerYear(currentDate.getFullYear());
  }, [currentDate]);

  useEffect(() => {
    if (!isMonthPickerOpen) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (monthPickerRef.current?.contains(target) || monthButtonRef.current?.contains(target)) return;
      setIsMonthPickerOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMonthPickerOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMonthPickerOpen]);

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    const nextView = viewToFullCalendar(activeView);
    if (api.view.type !== nextView) api.changeView(nextView);
    api.gotoDate(currentDate);
  }, [activeView, currentDate]);

  const activeAccount = accounts.find((item) => item.id === activeAccountId) || accounts[0];
  const activeAccountLabel = activeAccount
    ? [activeAccount.profileName, activeAccount.ownerUsername].filter(Boolean).join(" · ")
    : "";
  const visibleEvents = assignedOnlyMode
    ? events
    : events.filter((event) => event.source === "manual" || event.accountId === activeAccount?.id);

  const accountMap = useMemo(() => {
    const map = new Map<string, CalendarAccount>();
    accounts.forEach((item) => map.set(item.id, item));
    return map;
  }, [accounts]);

  const fullCalendarEvents = useMemo(
    () =>
      visibleEvents.map((event) => {
        if (event.source === "manual") {
          const tone = event.callStatus === "assigned" ? manualAssignedTone : manualPendingTone;
          return {
            id: `manual:${event.manualEventId || event.id}`,
            title: event.title,
            start: event.start,
            end: event.end,
            backgroundColor: tone.eventBg,
            borderColor: tone.eventBorder,
            textColor: tone.eventText,
            extendedProps: { rawEvent: event }
          };
        }
        const tone = accountMap.get(String(event.accountId || "")) || activeAccount;
        return {
          id: `outlook:${event.id}`,
          title: event.title,
          start: event.start,
          end: event.end,
          backgroundColor: tone?.eventBg || "#e5e7eb",
          borderColor: tone?.eventBorder || "#d1d5db",
          textColor: tone?.eventText || "#111827",
          extendedProps: { rawEvent: event }
        };
      }),
    [accountMap, activeAccount, visibleEvents]
  );

  const filteredProfileOptions = useMemo(() => {
    if (!(isAdmin && !manualForm.id)) return profileOptions;
    if (!manualForm.ownerUserId) return [];
    return profileOptions.filter(
      (profile: any) => String(profile?.user_id || "") === String(manualForm.ownerUserId || "")
    );
  }, [isAdmin, manualForm.id, manualForm.ownerUserId, profileOptions]);

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

  const shiftDate = (direction: "prev" | "next") => {
    const delta = direction === "next" ? 1 : -1;
    if (activeView === "Week") return setCurrentDate((prev) => addDays(prev, delta * 7));
    if (activeView === "Day") return setCurrentDate((prev) => addDays(prev, delta));
    return setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleConnectCalendar = () => {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", profilesRoute);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const openManualCreate = (start: Date, end: Date) => {
    const safeEnd = end > start ? end : addMinutes(start, 60);
    setManualError("");
    setManualForm({
      id: null,
      ownerUserId: user?.id || null,
      title: "",
      startAt: toLocalDateTimeInput(start.toISOString()),
      endAt: toLocalDateTimeInput(safeEnd.toISOString()),
      profileId: "",
      callerUserId: "",
      note: "",
      callStatus: "unassigned",
      requestStatus: null,
      callerRequestId: null
    });
    setManualModalOpen(true);
  };

  const openManualEdit = (event: CalendarEventItem) => {
    setManualError("");
    setManualForm({
      id: event.manualEventId || event.id,
      ownerUserId: event.ownerUserId || null,
      title: event.title || "",
      startAt: toLocalDateTimeInput(event.start),
      endAt: toLocalDateTimeInput(event.end),
      profileId: event.profileId || "",
      callerUserId: event.requestedCallerUserId || "",
      note: event.note || "",
      callStatus: event.callStatus || "unassigned",
      requestStatus: event.requestStatus || null,
      callerRequestId: event.callerRequestId || null
    });
    setManualModalOpen(true);
  };

  const closeManualModal = () => {
    if (manualSubmitting || manualDecisionSubmitting) return;
    setManualModalOpen(false);
    setManualError("");
  };

  const handleDateClick = (info: any) => {
    if (skipDateClickRef.current) {
      skipDateClickRef.current = false;
      return;
    }
    const start = info?.date ? new Date(info.date) : new Date();
    if (info?.allDay) start.setHours(9, 0, 0, 0);
    openManualCreate(start, addMinutes(start, 60));
  };

  const handleSelect = (info: any) => {
    skipDateClickRef.current = true;
    const start = info?.start ? new Date(info.start) : new Date();
    const end = info?.end ? new Date(info.end) : addMinutes(start, 60);
    openManualCreate(start, end);
    info?.view?.calendar?.unselect?.();
  };

  const handleEventClick = (info: any) => {
    const raw = info?.event?.extendedProps?.rawEvent as CalendarEventItem | undefined;
    if (!raw) return;
    if (raw.source === "manual") {
      openManualEdit(raw);
      return;
    }
    setSelectedEvent(raw);
    setCallerError("");
    setCallerMode(isAdmin ? "assign" : "request");
    setCallerModalOpen(true);
  };

  const closeCallerModal = () => {
    if (callerSubmitting) return;
    setCallerModalOpen(false);
    setCallerError("");
    setSelectedEvent(null);
  };

  const handleSync = async () => {
    if (!activeAccountId) return;
    try {
      setEventsError(null);
      setEventsLoading(true);
      const res = await fetchWithToken(
        `${calendarEndpoint}/sync?account_id=${encodeURIComponent(activeAccountId)}&start=${encodeURIComponent(
          viewStart.toISOString()
        )}&end=${encodeURIComponent(viewEnd.toISOString())}`,
        { method: "POST" }
      );
      if (!res) return;
      if (!res.ok) throw new Error(`Failed to sync calendar (${res.status})`);
      await loadAccounts();
      await loadEvents(activeAccountId);
    } catch (err: any) {
      setEventsError(err?.message || "Unable to sync calendar.");
    } finally {
      setEventsLoading(false);
    }
  };

  const handleCallerSubmit = async ({ assigneeId, whenAt, jobUrl, meetingUrl, otherNotes }: any) => {
    try {
      setCallerSubmitting(true);
      setCallerError("");
      if (callerMode === "assign") {
        if (!selectedEvent?.id) return;
        const ok = window.confirm(`Assign this caller to "${selectedEvent.title || "event"}"?`);
        if (!ok) return;
        const res = await fetchWithToken(`${calendarEndpoint}/events/${selectedEvent.id}/assign`, {
          method: "POST",
          body: JSON.stringify({ assignee_user_id: assigneeId })
        });
        if (!res) return;
        if (!res.ok) throw new Error((await res.text()) || "Unable to assign caller.");
      } else {
        const existingRequests = (await requestsService.listRequests({ roles })) || [];
        const hasConflict = existingRequests.some((request) => {
          if (request?.role !== "caller" || request?.status === "closed") return false;
          if (String(request?.assignee_user_id) !== String(assigneeId)) return false;
          if (!request?.when_at || !selectedEvent?.start) return false;
          const requestMs = new Date(request.when_at).getTime();
          const eventStart = new Date(selectedEvent.start).getTime();
          const eventEnd = selectedEvent.end ? new Date(selectedEvent.end).getTime() : eventStart;
          if (Number.isNaN(requestMs) || Number.isNaN(eventStart) || Number.isNaN(eventEnd)) return false;
          return requestMs >= eventStart - 15 * 60 * 1000 && requestMs <= eventEnd + 15 * 60 * 1000;
        });
        if (hasConflict) {
          window.alert(callerConflictAlert);
          return;
        }
        await requestsService.createRequest(
          {
            role: "caller",
            detail: { job_url: jobUrl || "", meeting_url: meetingUrl || "", other: otherNotes || "" },
            assignee_user_id: assigneeId,
            when_at: whenAt
          },
          { roles }
        );
      }
      closeCallerModal();
      await loadEvents(activeAccountId);
    } catch (err: any) {
      setCallerError(err?.message || "Unable to submit caller action.");
    } finally {
      setCallerSubmitting(false);
    }
  };

  const saveManualEvent = async () => {
    const canUpdateManual = !manualForm.id || isAdmin || manualForm.ownerUserId === user?.id;
    if (!canUpdateManual) {
      setManualError("Only the event owner can update this manual event.");
      return;
    }
    if (!manualForm.id && isAdmin && !manualForm.ownerUserId) {
      setManualError("Please select a user first.");
      return;
    }
    const title = manualForm.title.trim();
    const startAt = toIsoFromLocalDateTime(manualForm.startAt);
    const endAt = toIsoFromLocalDateTime(manualForm.endAt);
    if (!title) return setManualError("Title is required.");
    if (!startAt || !endAt) return setManualError("Start and end are required.");
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return setManualError("End must be after start.");
    }
    try {
      setManualSubmitting(true);
      setManualError("");
      const payload = {
        title,
        start_at: startAt,
        end_at: endAt,
        profile_id: manualForm.profileId || null,
        caller_user_id: manualForm.callerUserId || null,
        note: manualForm.note.trim() || null,
        ...(!manualForm.id && isAdmin ? { owner_user_id: manualForm.ownerUserId } : {})
      };
      const path = manualForm.id
        ? `${calendarEndpoint}/events/manual/${encodeURIComponent(manualForm.id)}`
        : `${calendarEndpoint}/events/manual`;
      const res = await fetchWithToken(path, {
        method: manualForm.id ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      if (!res) return;
      if (!res.ok) throw new Error((await res.text()) || "Unable to save manual event.");
      setManualModalOpen(false);
      await loadEvents(activeAccountId);
    } catch (err: any) {
      setManualError(err?.message || "Unable to save manual event.");
    } finally {
      setManualSubmitting(false);
    }
  };

  const decideManualRequest = async (decision: "accept" | "reject") => {
    if (!manualForm.id) return;
    try {
      setManualDecisionSubmitting(true);
      setManualError("");
      const res = await fetchWithToken(
        `${calendarEndpoint}/events/manual/${encodeURIComponent(manualForm.id)}/request-decision`,
        { method: "POST", body: JSON.stringify({ decision }) }
      );
      if (!res) return;
      if (!res.ok) throw new Error((await res.text()) || "Unable to update request decision.");
      const updated = await res.json();
      setManualForm((prev) => ({
        ...prev,
        callStatus: mapCallStatus(updated),
        requestStatus: updated.request_status || null,
        callerRequestId: updated.caller_request_id || null,
        callerUserId: updated.requested_caller_user_id || ""
      }));
      await loadEvents(activeAccountId);
    } catch (err: any) {
      setManualError(err?.message || "Unable to update request decision.");
    } finally {
      setManualDecisionSubmitting(false);
    }
  };

  const canApproveManualRequest =
    isAdmin &&
    !!manualForm.id &&
    !!manualForm.callerRequestId &&
    (manualForm.callStatus === "pending" || manualForm.requestStatus === "pending");
  const canSaveManualEvent = !manualForm.id || isAdmin || manualForm.ownerUserId === user?.id;

  const views = ["Month", "Week", "Day"];

  return (
    <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <aside className="border border-border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Calendars</div>
            <div className="mt-4 space-y-2">
              {accountsLoading ? (
                <div className="text-sm text-ink-muted">Loading calendars...</div>
              ) : accountsError ? (
                <div className="text-sm text-red-600">Couldn&apos;t load calendars.</div>
              ) : accounts.length === 0 ? (
                <div className="text-sm text-ink-muted">No calendars connected yet.</div>
              ) : (
                accounts.map((calendar) => (
                  <button
                    key={calendar.id}
                    type="button"
                    onClick={() => setActiveAccountId(calendar.id)}
                    className={`w-full min-w-0 flex items-start gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      calendar.id === activeAccountId
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-ink-muted hover:text-ink hover:bg-gray-100"
                    }`}
                  >
                    <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${calendar.dot}`} />
                    <span className="min-w-0">
                      <span className={`block truncate ${calendar.text}`}>{calendar.email}</span>
                      {[calendar.profileName, calendar.ownerUsername].filter(Boolean).length ? (
                        <span className="mt-1 block truncate text-xs font-medium text-ink-muted">
                          {[calendar.profileName, calendar.ownerUsername].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))
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

          <section className="flex flex-col gap-4 border border-border bg-white p-4">
            <header>
              <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
              <p className="text-sm text-ink-muted">{activeAccount?.email || "Manual + assigned events"}</p>
              {activeAccountLabel ? <p className="text-xs text-ink-muted">{activeAccountLabel}</p> : null}
            </header>

            <div className="flex flex-wrap items-center gap-2">
              {views.map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    activeView === view ? "bg-accent-primary text-white" : "bg-gray-100 text-ink-muted hover:text-ink"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="mb-4 flex items-center justify-between text-xs text-ink-muted">
                <span className="flex items-center gap-2">
                  <Calendar size={14} />
                  {viewLabel}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftDate("prev")}
                    className="flex items-center justify-center rounded-lg border border-border px-2 py-1.5 text-xs text-ink-muted hover:text-ink"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftDate("next")}
                    className="flex items-center justify-center rounded-lg border border-border px-2 py-1.5 text-xs text-ink-muted hover:text-ink"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={!activeAccountId}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-60 disabled:cursor-not-allowed"
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
                    >
                      Select month
                      <ChevronDown size={14} />
                    </button>
                    {isMonthPickerOpen ? (
                      <div ref={monthPickerRef} className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-white shadow-lg">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <button type="button" onClick={() => setPickerYear((prev) => prev - 1)} className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink">
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-sm font-semibold text-ink">{pickerYear}</span>
                          <button type="button" onClick={() => setPickerYear((prev) => prev + 1)} className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink">
                            <ChevronRight size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-3">
                          {monthShort.map((label, index) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                setCurrentDate(new Date(pickerYear, index, 1));
                                setIsMonthPickerOpen(false);
                              }}
                              className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                                pickerYear === currentDate.getFullYear() && index === currentDate.getMonth()
                                  ? "bg-accent-primary text-white"
                                  : "bg-gray-50 text-ink-muted hover:text-ink hover:bg-gray-100"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {eventsLoading ? (
                <div className="rounded-xl border border-border bg-gray-50 p-4 text-sm text-ink-muted">Loading events...</div>
              ) : eventsError ? (
                <div className="rounded-xl border border-border bg-white p-4 text-sm text-red-600">Couldn&apos;t load events.</div>
              ) : (
                <div className="calendar-shell max-h-[70vh] overflow-auto">
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={viewToFullCalendar(activeView)}
                    initialDate={currentDate}
                    headerToolbar={false}
                    firstDay={1}
                    nowIndicator={activeView !== "Month"}
                    allDaySlot={false}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    dayMaxEventRows={3}
                    selectable
                    selectMirror
                    events={fullCalendarEvents}
                    height="auto"
                    dateClick={handleDateClick}
                    select={handleSelect}
                    eventClick={handleEventClick}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <HireRequestModal
        open={callerModalOpen}
        title={callerMode === "assign" ? "Assign caller" : "Request caller"}
        roleLabel="Caller"
        rateLabel="Rate per minute"
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
      />

      <Modal
        open={manualModalOpen}
        onClose={closeManualModal}
        title={manualForm.id ? "Edit manual event" : "Create manual event"}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {canApproveManualRequest ? (
                <>
                  <button type="button" onClick={() => decideManualRequest("accept")} disabled={manualDecisionSubmitting} className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60">
                    <Check size={14} />
                    Accept
                  </button>
                  <button type="button" onClick={() => decideManualRequest("reject")} disabled={manualDecisionSubmitting} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                    <X size={14} />
                    Reject
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeManualModal} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
                Cancel
              </button>
              <button type="button" onClick={saveManualEvent} disabled={manualSubmitting || !canSaveManualEvent} className="rounded-lg bg-accent-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {manualSubmitting ? "Saving..." : manualForm.id ? "Save event" : "Create event"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Title</label>
            <input type="text" value={manualForm.title} onChange={(event) => setManualForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-ink">Start</label>
              <input type="datetime-local" value={manualForm.startAt} onChange={(event) => setManualForm((prev) => ({ ...prev, startAt: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-ink">End</label>
              <input type="datetime-local" value={manualForm.endAt} onChange={(event) => setManualForm((prev) => ({ ...prev, endAt: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
            </div>
          </div>
          {isAdmin && !manualForm.id ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-ink">User</label>
              <select
                value={manualForm.ownerUserId || ""}
                disabled={ownerLoading}
                onChange={(event) =>
                  setManualForm((prev) => ({
                    ...prev,
                    ownerUserId: event.target.value || null,
                    profileId: ""
                  }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              >
                <option value="">Select user</option>
                {ownerOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.username || item.display_name || item.email || item.id}
                  </option>
                ))}
              </select>
              {ownerError ? <p className="text-xs text-red-600">{ownerError}</p> : null}
            </div>
          ) : null}
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Profile (optional)</label>
            <select
              value={manualForm.profileId}
              disabled={profileLoading || (isAdmin && !manualForm.id && !manualForm.ownerUserId)}
              onChange={(event) => setManualForm((prev) => ({ ...prev, profileId: event.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            >
              <option value="">No profile</option>
              {filteredProfileOptions.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name || "Untitled"}
                </option>
              ))}
            </select>
            {profileError ? <p className="text-xs text-red-600">{profileError}</p> : null}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Caller (optional)</label>
            <select value={manualForm.callerUserId} disabled={callerLoading} onChange={(event) => setManualForm((prev) => ({ ...prev, callerUserId: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40">
              <option value="">No caller</option>
              {callerList.map((caller) => (
                <option key={String(caller.user_id ?? caller.id)} value={String(caller.user_id ?? caller.id)}>
                  {caller.display_name || caller.name || caller.username || caller.email || caller.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Note (optional)</label>
            <textarea value={manualForm.note} onChange={(event) => setManualForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
          </div>
          {!canSaveManualEvent && manualForm.id ? (
            <p className="text-sm text-amber-700">Read-only: only the owner can update this event.</p>
          ) : null}
          {manualError ? <p className="text-sm text-red-600">{manualError}</p> : null}
        </div>
      </Modal>
    </main>
  );
};

export default CalendarPage;
