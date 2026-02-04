import { useEffect, useMemo, useState } from "react";
import { Download, Search, ExternalLink, Flag } from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";
import { useUser } from "../../hooks/useUser";

type BidEntry = {
  profile_id: string;
  profile_name: string;
  profile_color?: string;
  timestamp: string;
  profile_owner_id?: string | null;
  profile_owner_username?: string | null;
  can_report?: boolean;
};

type Application = {
  id: string;
  user_id: string;
  url: string;
  bids: BidEntry[];
  created_at: string;
  updated_at: string;
  latest_applied_at?: string | null;
  is_owner?: boolean;
  user_username?: string | null;
  user_email?: string | null;
  user_display_name?: string | null;
};

const APPLICATIONS_ENDPOINT = API_BASE ? `${API_BASE}/applications` : "/applications";

const formatDateTime = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const parseDateInput = (value: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const startOfWeek = (date: Date) => {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = base.getDay();
  const offset = (day + 6) % 7;
  base.setDate(base.getDate() - offset);
  return base;
};

const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const getRangeForMethod = (anchor: Date, method: string) => {
  if (method === "Daily") {
    const day = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    return { from: day, to: day };
  }
  if (method === "Monthly") {
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const to = endOfMonth(from);
    return { from, to };
  }
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  return { from, to };
};

const escapeCsv = (value: string) => {
  const safe = value ?? "";
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

const buildCsv = (rows: Application[]) => {
  const header = ["User", "Profile", "Applied By", "URL", "Applied At"];
  const lines = rows.flatMap((app) =>
    (app.bids || []).map((bid) => [
      escapeCsv(bid.profile_owner_username || ""),
      escapeCsv(bid.profile_name || bid.profile_id || ""),
      escapeCsv(app.user_username || app.user_email || app.user_id || ""),
      escapeCsv(app.url || ""),
      escapeCsv(formatDateTime(bid.timestamp || ""))
    ])
  );
  return [header.join(","), ...lines.map((line) => line.join(","))].join("\n");
};

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ApplicationsPage = () => {
  const { user } = useUser();
  const defaultRangeMethod = "Weekly";
  const initialRange = getRangeForMethod(new Date(), defaultRangeMethod);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState(() => toDateInputValue(initialRange.from));
  const [toDate, setToDate] = useState(() => toDateInputValue(initialRange.to));
  const [rangeMethod, setRangeMethod] = useState(defaultRangeMethod);

  const hasFilters = Boolean(query.trim() || fromDate || toDate);

  const fetchApplications = async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError("Missing token");
      setApplications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const url = params.toString()
        ? `${APPLICATIONS_ENDPOINT}?${params.toString()}`
        : APPLICATIONS_ENDPOINT;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load applications.");
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setApplications(items);
    } catch (err: any) {
      setError(err.message || "Unable to load applications.");
      setApplications([]);
      // eslint-disable-next-line no-console
      console.error("Error loading applications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      fetchApplications();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, fromDate, toDate]);

  const handleClearFilters = () => {
    setQuery("");
    setFromDate("");
    setToDate("");
  };

  const handleMethodChange = (value: string) => {
    setRangeMethod(value);
    const anchor = parseDateInput(fromDate) || parseDateInput(toDate) || new Date();
    const range = getRangeForMethod(anchor, value);
    setFromDate(toDateInputValue(range.from));
    setToDate(toDateInputValue(range.to));
  };

  const shiftRange = (direction: "prev" | "next") => {
    const delta = direction === "next" ? 1 : -1;
    const currentFrom = parseDateInput(fromDate) || new Date();
    const currentTo = parseDateInput(toDate) || currentFrom;

    if (rangeMethod === "Daily") {
      const nextFrom = addDays(currentFrom, delta);
      const nextTo = addDays(currentTo, delta);
      setFromDate(toDateInputValue(nextFrom));
      setToDate(toDateInputValue(nextTo));
      return;
    }

    if (rangeMethod === "Monthly") {
      const base = new Date(currentFrom.getFullYear(), currentFrom.getMonth(), 1);
      const nextBase = addMonths(base, delta);
      setFromDate(toDateInputValue(nextBase));
      setToDate(toDateInputValue(endOfMonth(nextBase)));
      return;
    }

    const nextFrom = addDays(currentFrom, delta * 7);
    const nextTo = addDays(currentTo, delta * 7);
    setFromDate(toDateInputValue(nextFrom));
    setToDate(toDateInputValue(nextTo));
  };

  const handleReport = (row: {
    url: string;
    profileId?: string;
    appliedBy?: string;
  }) => {
    // Placeholder action until a report endpoint exists.
    // eslint-disable-next-line no-console
    console.warn("Report application", row);
    window.alert("Report submitted.");
  };

  const handleOpenUrl = async (app: Application) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    let url = app.url;
    if (token) {
      try {
        const res = await fetch(`${APPLICATIONS_ENDPOINT}/${app.id}/open`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) url = data.url;
        }
      } catch (err) {
        // Ignore open errors; fallback to stored URL.
      }
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleExport = () => {
    const csv = buildCsv(applications);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`applications-${stamp}.csv`, csv);
  };

  const rows = useMemo(() => {
    const flat = applications.flatMap((app) =>
      (app.bids || []).map((bid) => ({
        key: `${app.id}-${bid.profile_id || bid.profileId || "profile"}-${bid.timestamp || "time"}`,
        user: bid.profile_owner_username || app.user_username || app.user_email || "-",
        profile: bid.profile_name || bid.profile_id || "-",
        appliedBy: app.user_username || app.user_email || app.user_id || "-",
        url: app.url || "",
        appliedAt: bid.timestamp || "",
        canReport: Boolean(
          bid.can_report ||
            app.is_owner ||
            (user?.id && bid.profile_owner_id === user.id) ||
            (user?.username && bid.profile_owner_username === user.username) ||
            (user?.email && bid.profile_owner_username === user.email) ||
            (user?.id && app.user_id === user.id)
        ),
        profileId: bid.profile_id || bid.profileId,
        appId: app.id
      }))
    );
    flat.sort((a, b) => {
      const aTime = new Date(a.appliedAt || 0).getTime();
      const bTime = new Date(b.appliedAt || 0).getTime();
      return bTime - aTime;
    });
    return flat;
  }, [applications, user?.email, user?.id, user?.username]);

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Applications</h1>
            <p className="text-sm text-ink-muted">Track application history captured by the extension.</p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-gray-50"
          >
            <Download size={16} />
            Save as Excel
          </button>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-white p-4 md:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink">
            <Search size={16} className="text-ink-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search profile or URL"
              className="w-full bg-transparent focus:outline-none"
            />
          </label>

          <button
            onClick={handleClearFilters}
            disabled={!hasFilters}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              hasFilters
                ? "border-border text-ink hover:bg-gray-50"
                : "border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Clear
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-xs text-ink-muted">
          <button
            type="button"
            onClick={() => shiftRange("prev")}
            className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-ink hover:bg-gray-50"
          >
            Prev
          </button>
          <label className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-md border border-border px-2 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-md border border-border px-2 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <button
            type="button"
            onClick={() => shiftRange("next")}
            className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-ink hover:bg-gray-50"
          >
            Next
          </button>
          <select
            value={rangeMethod}
            onChange={(event) => handleMethodChange(event.target.value)}
            className="rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Weekly">Weekly</option>
            <option value="Daily">Daily</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Applied By</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Applied At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                    Loading applications...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                    No applications found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.key} className="border-t border-border">
                    <td className="px-4 py-3 text-ink-muted">{index + 1}</td>
                    <td className="px-4 py-3">{row.user}</td>
                    <td className="px-4 py-3">{row.profile}</td>
                    <td className="px-4 py-3">{row.appliedBy}</td>
                    <td className="px-4 py-3">
                      {row.url ? (
                        <button
                          type="button"
                          onClick={() => handleOpenUrl({ id: row.appId, url: row.url } as Application)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <ExternalLink size={14} />
                          {row.url}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDateTime(row.appliedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {row.canReport ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleReport({
                              url: row.url,
                              profileId: row.profileId,
                              appliedBy: row.appliedBy
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          <Flag size={14} />
                          Report
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default ApplicationsPage;
