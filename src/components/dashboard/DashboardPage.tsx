import { useMemo } from "react";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  Inbox,
  RefreshCw,
  Users
} from "lucide-react";
import { useProfiles } from "../../hooks/useProfiles";
import { useUser } from "../../hooks/useUser";

const statusStyles = {
  Draft: "bg-gray-100 text-ink-muted",
  Applied: "bg-accent-primary/10 text-accent-primary",
  Applying: "bg-accent-primary/10 text-accent-primary",
  Interview: "bg-green-50 text-green-600",
  Interviewing: "bg-green-50 text-green-600",
  Offer: "bg-amber-50 text-amber-700",
  Closed: "bg-gray-100 text-ink-muted",
  Idle: "bg-gray-100 text-ink-muted"
};

const statusBarStyles = {
  Draft: "bg-gray-400/70",
  Applied: "bg-accent-primary",
  Applying: "bg-accent-primary",
  Interview: "bg-green-500",
  Interviewing: "bg-green-500",
  Offer: "bg-amber-500",
  Closed: "bg-gray-300",
  Idle: "bg-gray-300"
};

const formatStatusLabel = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) return "Draft";
  if (normalized === "applying") return "Applying";
  if (normalized === "applied") return "Applied";
  if (normalized === "interview") return "Interview";
  if (normalized === "interviewing") return "Interviewing";
  if (normalized === "offer") return "Offer";
  if (normalized === "closed") return "Closed";
  if (normalized === "idle") return "Idle";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const getUpdatedAt = (profile) => {
  const raw = profile?.raw || {};
  const value = raw.updated_at || raw.created_at || null;
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const getNextInterviewDate = (profile) => {
  const raw = profile?.raw || {};
  const value = raw.next_interview || raw.nextInterview || raw.base_info?.next_interview || null;
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const DashboardPage = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const scope = roles.includes("admin") || roles.includes("manager") ? "all" : undefined;
  const { profiles, loading, error, refreshProfiles } = useProfiles({ scope });

  const metrics = useMemo(() => {
    const items = Array.isArray(profiles) ? profiles : [];
    const total = items.length;
    const statusCounts = {};
    let activeCount = 0;
    let interviewCount = 0;
    let unreadTotal = 0;
    let assignedCount = 0;
    let connectedCount = 0;
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    items.forEach((profile) => {
      const statusLabel = formatStatusLabel(profile?.status);
      statusCounts[statusLabel] = (statusCounts[statusLabel] || 0) + 1;
      const normalized = String(statusLabel || "").toLowerCase();
      if (normalized !== "closed") activeCount += 1;
      const interviewDate = getNextInterviewDate(profile);
      if (interviewDate && interviewDate >= now && interviewDate <= weekAhead) interviewCount += 1;
      const unread = Number(profile?.unreadCount || 0);
      unreadTotal += Number.isNaN(unread) ? 0 : unread;
      if (profile?.assignedBidderId) assignedCount += 1;
      if (profile?.emailConnected) connectedCount += 1;
    });

    const unassignedCount = Math.max(total - assignedCount, 0);
    const coverage = total ? Math.round((assignedCount / total) * 100) : 0;

    const statusOrder = [
      "Draft",
      "Applying",
      "Applied",
      "Interviewing",
      "Interview",
      "Offer",
      "Closed",
      "Idle"
    ];
    const statusItems = [
      ...statusOrder.filter((status) => statusCounts[status]),
      ...Object.keys(statusCounts).filter((status) => !statusOrder.includes(status))
    ].map((status) => {
      const count = statusCounts[status] || 0;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { status, count, percent };
    });

    const recentProjects = [...items]
      .sort((a, b) => {
        const dateA = getUpdatedAt(a);
        const dateB = getUpdatedAt(b);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 6);

    const upcomingInterviews = [...items]
      .map((profile) => ({ profile, date: getNextInterviewDate(profile) }))
      .filter((item) => item.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    const attentionList = [...items]
      .filter((profile) => {
        const unread = Number(profile?.unreadCount || 0);
        const status = formatStatusLabel(profile?.status).toLowerCase();
        return !profile?.assignedBidderId || unread > 0 || status === "draft";
      })
      .sort((a, b) => {
        const unreadA = Number(a?.unreadCount || 0);
        const unreadB = Number(b?.unreadCount || 0);
        if (unreadA !== unreadB) return unreadB - unreadA;
        const assignedA = a?.assignedBidderId ? 1 : 0;
        const assignedB = b?.assignedBidderId ? 1 : 0;
        return assignedA - assignedB;
      })
      .slice(0, 6);

    return {
      total,
      activeCount,
      interviewCount,
      unreadTotal,
      assignedCount,
      unassignedCount,
      connectedCount,
      coverage,
      statusItems,
      recentProjects,
      upcomingInterviews,
      attentionList
    };
  }, [profiles]);

  const attentionCount = metrics.attentionList.length;
  const insightMessage = loading
    ? "Gathering activity across your projects..."
    : attentionCount > 0
      ? `${attentionCount} project${attentionCount === 1 ? "" : "s"} need attention today.`
      : "Everything looks calm across projects.";

  return (
    <main className="relative min-h-[calc(100vh-64px)] overflow-hidden border-t border-border bg-page px-6 py-6">
      <style>{`
        @keyframes dashRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-rise { animation: dashRise 600ms ease-out both; }
        .dash-rise-1 { animation-delay: 80ms; }
        .dash-rise-2 { animation-delay: 160ms; }
        .dash-rise-3 { animation-delay: 240ms; }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-120px] h-80 w-80 rounded-full bg-gradient-to-br from-sky-200 via-white to-amber-100 opacity-70 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[-80px] h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-100 via-white to-sky-100 opacity-70 blur-3xl" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.08) 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }}
        />
      </div>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6">
        <header className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="dash-rise dash-rise-1 rounded-3xl border border-border/70 bg-white/90 p-6 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-ink-muted">Workspace Pulse</p>
                <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Dashboard</h1>
                <p className="mt-2 text-sm text-ink-muted">
                  A clean view of projects, assignments, and interview momentum.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshProfiles}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-4 py-2 text-xs font-semibold text-ink-muted shadow-sm transition hover:text-ink"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            <div className="mt-5 text-sm text-ink-muted">{insightMessage}</div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Active {loading ? "-" : metrics.activeCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Unread {loading ? "-" : metrics.unreadTotal}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Interviews {loading ? "-" : metrics.interviewCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Unassigned {loading ? "-" : metrics.unassignedCount}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-white/70 px-4 py-3">
                <p className="text-xs text-ink-muted">Total projects</p>
                <p className="text-lg font-semibold text-ink">{loading ? "-" : metrics.total}</p>
              </div>
              <div className="rounded-2xl border border-border bg-white/70 px-4 py-3">
                <p className="text-xs text-ink-muted">Email connected</p>
                <p className="text-lg font-semibold text-ink">{loading ? "-" : metrics.connectedCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-white/70 px-4 py-3">
                <p className="text-xs text-ink-muted">Assignments</p>
                <p className="text-lg font-semibold text-ink">
                  {loading ? "-" : `${metrics.assignedCount}/${metrics.total}`}
                </p>
              </div>
            </div>
          </div>

          <div className="dash-rise dash-rise-2 rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-emerald-600 p-6 text-white shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">Assignment Coverage</p>
                <p className="mt-2 text-4xl font-semibold">{loading ? "--" : `${metrics.coverage}%`}</p>
                <p className="text-xs text-white/70">
                  {loading ? "--" : `${metrics.assignedCount} assigned / ${metrics.unassignedCount} open`}
                </p>
              </div>
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#ffffff ${metrics.coverage}%, rgba(255,255,255,0.2) 0)`
                  }}
                />
                <div className="absolute inset-2 rounded-full bg-sky-700/80 backdrop-blur" />
                <span className="relative text-sm font-semibold">
                  {loading ? "--" : `${metrics.coverage}%`}
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-white/20 px-3 py-2">
                <p className="text-white/70">Unread</p>
                <p className="text-lg font-semibold">{loading ? "-" : metrics.unreadTotal}</p>
              </div>
              <div className="rounded-xl bg-white/20 px-3 py-2">
                <p className="text-white/70">Interviews</p>
                <p className="text-lg font-semibold">{loading ? "-" : metrics.interviewCount}</p>
              </div>
              <div className="rounded-xl bg-white/20 px-3 py-2">
                <p className="text-white/70">Active</p>
                <p className="text-lg font-semibold">{loading ? "-" : metrics.activeCount}</p>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="dash-rise dash-rise-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-muted">Total projects</p>
                <p className="text-2xl font-semibold text-ink">{loading ? "-" : metrics.total}</p>
                <p className="text-xs text-ink-muted">{loading ? "-" : `${metrics.activeCount} active`}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
                <Briefcase size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-muted">Interviews in 7 days</p>
                <p className="text-2xl font-semibold text-ink">{loading ? "-" : metrics.interviewCount}</p>
                <p className="text-xs text-ink-muted">Upcoming schedule</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                <Calendar size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-muted">Unread inbox</p>
                <p className="text-2xl font-semibold text-ink">{loading ? "-" : metrics.unreadTotal}</p>
                <p className="text-xs text-ink-muted">Across all projects</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Inbox size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-muted">Unassigned projects</p>
                <p className="text-2xl font-semibold text-ink">{loading ? "-" : metrics.unassignedCount}</p>
                <p className="text-xs text-ink-muted">Needs coverage</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Users size={18} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">Pipeline status</h2>
                <p className="text-xs text-ink-muted">Where projects sit today</p>
              </div>
              <ClipboardList size={18} className="text-ink-muted" />
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-ink-muted">Loading pipeline...</div>
              ) : metrics.statusItems.length === 0 ? (
                <div className="text-sm text-ink-muted">No projects yet.</div>
              ) : (
                metrics.statusItems.map((item) => (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <span>{item.status}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${statusBarStyles[item.status] || "bg-gray-300"}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">Upcoming interviews</h2>
                <p className="text-xs text-ink-muted">Next scheduled slots</p>
              </div>
              <Calendar size={18} className="text-ink-muted" />
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-ink-muted">Loading interviews...</div>
              ) : metrics.upcomingInterviews.length === 0 ? (
                <div className="text-sm text-ink-muted">No interviews scheduled.</div>
              ) : (
                metrics.upcomingInterviews.map((item) => (
                  <div key={item.profile.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.profile.name}</p>
                      <p className="text-xs text-ink-muted">
                        {item.profile.ownerUsername || item.profile.ownerEmail || "Unknown owner"}
                      </p>
                    </div>
                    <span className="text-xs text-ink-muted">{formatDateTime(item.date)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">Assignment overview</h2>
                <p className="text-xs text-ink-muted">Coverage and connectivity</p>
              </div>
              <Users size={18} className="text-ink-muted" />
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Assigned</span>
                  <span>{loading ? "-" : `${metrics.assignedCount} / ${metrics.total}`}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-accent-primary"
                    style={{ width: `${metrics.coverage}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-3 text-sm text-ink">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Unassigned projects</span>
                  <span className="font-semibold">{loading ? "-" : metrics.unassignedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Email connected</span>
                  <span className="font-semibold">{loading ? "-" : metrics.connectedCount}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">Recent projects</h2>
                <p className="text-xs text-ink-muted">Latest activity across your workspace</p>
              </div>
              <Briefcase size={18} className="text-ink-muted" />
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-ink-muted">Loading projects...</div>
              ) : metrics.recentProjects.length === 0 ? (
                <div className="text-sm text-ink-muted">No projects yet.</div>
              ) : (
                metrics.recentProjects.map((profile) => {
                  const statusLabel = formatStatusLabel(profile.status);
                  const date = getUpdatedAt(profile);
                  return (
                    <div key={profile.id} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-ink">{profile.name}</p>
                        <p className="text-xs text-ink-muted">
                          {profile.ownerUsername || profile.ownerEmail || "Unknown owner"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[statusLabel] || "bg-gray-100 text-ink-muted"}`}>
                          {statusLabel}
                        </span>
                        <p className="text-xs text-ink-muted">{formatDateTime(date)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white/90 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
                <p className="text-xs text-ink-muted">Unassigned or high-unread projects</p>
              </div>
              <Inbox size={18} className="text-ink-muted" />
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-ink-muted">Loading queue...</div>
              ) : metrics.attentionList.length === 0 ? (
                <div className="text-sm text-ink-muted">Everything looks calm.</div>
              ) : (
                metrics.attentionList.map((profile) => {
                  const unread = Number(profile?.unreadCount || 0);
                  const statusLabel = formatStatusLabel(profile.status);
                  return (
                    <div key={profile.id} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-ink">{profile.name}</p>
                        <p className="text-xs text-ink-muted">
                          {profile.assignedBidderId ? `Assigned to ${profile.bidder}` : "Unassigned"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {unread > 0 ? (
                          <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-semibold text-accent-primary">
                            {unread} unread
                          </span>
                        ) : null}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[statusLabel] || "bg-gray-100 text-ink-muted"}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default DashboardPage;
