import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, RefreshCw, ShieldCheck, ShieldX, Trash2, UserCog } from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { adminService } from "../../services/adminService";

type UserRow = {
  id: string;
  email?: string;
  username?: string;
  display_name?: string;
  roles?: string[];
  badges?: string[];
  verified?: boolean;
  blocked_at?: string | null;
  is_blocked?: boolean;
};

type UserTab = "external" | "internal";
const BADGE_KEYS = ["manager", "bidder", "caller"];

const formatUsernameLabel = (user: UserRow) =>
  user?.username || user?.email || user?.id || "Unknown";

const formatNameLabel = (user: UserRow) =>
  user?.display_name || "-";

const formatBadgeLabel = (badge: string) => {
  const normalized = String(badge || "").toLowerCase();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const hasBadge = (user: UserRow, badge: string): boolean => {
  const list = Array.isArray(user?.badges) ? user.badges : [];
  return list.some((item) => String(item || "").toLowerCase() === badge.toLowerCase());
};

const isBlockedUser = (user: UserRow): boolean => Boolean(user?.is_blocked || user?.blocked_at);
const isNotVerifiedUser = (user: UserRow): boolean => !Boolean(user?.verified);

const AdminPage = () => {
  const { user, loading: userLoading } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin");

  const [activeTab, setActiveTab] = useState<UserTab>("external");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busyUserId, setBusyUserId] = useState("");

  const loadUsers = useCallback(
    async (nextQuery = query, nextTab = activeTab) => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        setError("");
        const items = await adminService.listUsers({
          q: nextQuery.trim(),
          scope: nextTab,
          excludeSelf: nextTab === "internal"
        });
        setUsers(items);
      } catch (err: any) {
        setError(err?.message || "Unable to load users.");
      } finally {
        setLoading(false);
      }
    },
    [activeTab, isAdmin, query]
  );

  useEffect(() => {
    if (isAdmin) {
      void loadUsers("", activeTab);
    }
  }, [activeTab, isAdmin, loadUsers]);

  const handleDeleteUser = async (target: UserRow) => {
    if (!target?.id) return;
    const ok = window.confirm(`Delete user "${formatUsernameLabel(target)}"?`);
    if (!ok) return;
    try {
      setBusyUserId(target.id);
      setError("");
      await adminService.deleteUser(target.id);
      setUsers((prev) => prev.filter((item) => item.id !== target.id));
    } catch (err: any) {
      setError(err?.message || "Unable to delete user.");
    } finally {
      setBusyUserId("");
    }
  };

  const handleToggleBlock = async (target: UserRow) => {
    if (!target?.id) return;
    const nextBlocked = !isBlockedUser(target);
    try {
      setBusyUserId(target.id);
      setError("");
      const data = await adminService.setUserBlocked(target.id, nextBlocked);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                blocked_at: data?.blocked_at || null,
                is_blocked: Boolean(data?.is_blocked)
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err?.message || "Unable to update blocked status.");
    } finally {
      setBusyUserId("");
    }
  };

  const handleToggleBadge = async (target: UserRow, badge: string) => {
    if (!target?.id) return;
    const currentlyAssigned = hasBadge(target, badge);
    try {
      setBusyUserId(`${target.id}:${badge}`);
      setError("");
      const data = await adminService.updateUserBadge(target.id, {
        badge,
        action: currentlyAssigned ? "remove" : "add"
      });
      const nextBadges = Array.isArray(data?.badges) ? data.badges : [];
      setUsers((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, badges: nextBadges } : item))
      );
    } catch (err: any) {
      setError(err?.message || "Unable to update badge.");
    } finally {
      setBusyUserId("");
    }
  };

  const handleVerifyUser = async (target: UserRow) => {
    if (!target?.id) return;
    try {
      setBusyUserId(target.id);
      setError("");
      const data = await adminService.setUserVerified(target.id, true);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                verified: Boolean(data?.verified)
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err?.message || "Unable to verify user.");
    } finally {
      setBusyUserId("");
    }
  };

  const rows = useMemo(() => users || [], [users]);

  if (userLoading) {
    return (
      <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
        <div className="mx-auto max-w-[1440px] text-sm text-ink-muted">Loading users page...</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
        <div className="mx-auto max-w-[1440px] rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
          Admin access required.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Users</h1>
            <p className="text-sm text-ink-muted">Manage normal users and internal users.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadUsers(query, activeTab);
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setActiveTab("external")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  activeTab === "external" ? "bg-accent-primary text-white" : "text-ink-muted"
                }`}
              >
                Normal Users
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("internal")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  activeTab === "internal" ? "bg-accent-primary text-white" : "text-ink-muted"
                }`}
              >
                Internal Users
              </button>
            </div>
            <div className="flex-1 min-w-[240px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users by name, email, or username"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void loadUsers(query, activeTab);
              }}
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Search
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
            Loading users...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  {activeTab === "internal" ? <th className="px-4 py-3">Badges</th> : null}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const blocked = isBlockedUser(row);
                  const notVerified = isNotVerifiedUser(row);
                  const isBusy = busyUserId === row.id;
                  return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-ink">{formatUsernameLabel(row)}</td>
                      <td className="px-4 py-3 text-ink">{formatNameLabel(row)}</td>
                      <td className="px-4 py-3 text-ink-muted">{row.email || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            blocked
                              ? "bg-red-100 text-red-700"
                              : notVerified
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {blocked ? "Blocked" : notVerified ? "Not verified" : "Active"}
                        </span>
                      </td>
                      {activeTab === "internal" ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {BADGE_KEYS.map((badge) => {
                              const assigned = hasBadge(row, badge);
                              const badgeBusy = busyUserId === `${row.id}:${badge}`;
                              return (
                                <button
                                  key={`${row.id}-${badge}`}
                                  type="button"
                                  onClick={() => {
                                    void handleToggleBadge(row, badge);
                                  }}
                                  disabled={badgeBusy}
                                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                                    assigned
                                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                                      : "border-border text-ink-muted"
                                  }`}
                                >
                                  {formatBadgeLabel(badge)}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (blocked) {
                                void handleToggleBlock(row);
                                return;
                              }
                              if (notVerified) {
                                void handleVerifyUser(row);
                                return;
                              }
                              void handleToggleBlock(row);
                            }}
                            disabled={isBusy}
                            aria-label={blocked ? "Unblock user" : notVerified ? "Verify user" : "Block user"}
                            title={blocked ? "Unblock user" : notVerified ? "Verify user" : "Block user"}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border ${
                              blocked
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : notVerified
                                  ? "text-emerald-600 hover:bg-emerald-50"
                                  : "text-amber-600 hover:bg-amber-50"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {blocked ? <ShieldCheck size={16} /> : notVerified ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteUser(row);
                            }}
                            disabled={isBusy}
                            aria-label="Delete user"
                            title="Delete user"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white p-4 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <Ban size={14} />
            <span>
              Internal users tab excludes your own admin account.
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <UserCog size={14} />
            <span>
              Internal badges available: Manager, Bidder, Caller.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminPage;
