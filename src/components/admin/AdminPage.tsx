import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2, UserCheck, UserCog } from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { adminService } from "../../services/adminService";

const formatUsernameLabel = (user) =>
  user?.username || user?.user_name || user?.email || user?.id || "Unknown";

const formatNameLabel = (user) =>
  user?.display_name || user?.displayName || user?.name || "-";

const formatRoleLabel = (role) => {
  const normalized = String(role || "").toLowerCase();
  if (!normalized) return "";
  if (normalized === "worker") return "Employee";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getUserBadges = (user) => {
  const rawBadges = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.talents) ? user.talents : [])
  ];
  const seen = new Set();
  return rawBadges
    .map((badge) => String(badge || "").trim())
    .filter((badge) => {
      const key = badge.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const AdminPage = () => {
  const { user, loading: userLoading } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadUsers = useCallback(
    async (search = "") => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        setError("");
        const items = await adminService.listUsers(search.trim() || "");
        setUsers(items);
      } catch (err) {
        setError(err?.message || "Unable to load users.");
      } finally {
        setLoading(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (isAdmin) {
      loadUsers("");
    }
  }, [isAdmin, loadUsers]);

  const handleApproveManager = async (target) => {
    if (!target?.id) return;
    const targetRoles = Array.isArray(target.roles) ? target.roles : [];
    if (targetRoles.includes("manager")) return;
    try {
      setUpdatingId(target.id);
      setError("");
      const data = await adminService.updateUserRole(target.id, {
        role: "manager",
        action: "add"
      });
      const nextRoles = Array.isArray(data?.roles) ? data.roles : [...targetRoles, "manager"];
      setUsers((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, roles: nextRoles } : item))
      );
    } catch (err) {
      setError(err?.message || "Unable to update role.");
    } finally {
      setUpdatingId("");
    }
  };

  const handleDeleteUser = async (target) => {
    if (!target?.id) return;
    try {
      setDeletingId(target.id);
      setError("");
      await adminService.deleteUser(target.id);
      setUsers((prev) => prev.filter((item) => item.id !== target.id));
    } catch (err) {
      setError(err?.message || "Unable to delete user.");
    } finally {
      setDeletingId("");
    }
  };

  const tableRows = useMemo(() => users || [], [users]);

  if (userLoading) {
    return (
      <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
        <div className="mx-auto max-w-[1440px] text-sm text-ink-muted">Loading admin panel...</div>
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
            <h1 className="text-2xl font-semibold text-ink">Admin</h1>
            <p className="text-sm text-ink-muted">Review users, roles, and talent badges.</p>
          </div>
          <button
            type="button"
            onClick={() => loadUsers()}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <UserCog size={16} />
              Users
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
              onClick={() => loadUsers(query)}
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
        ) : tableRows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">User name</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Badges</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const rowRoles = Array.isArray(row.roles) ? row.roles : [];
                  const isManager = rowRoles.includes("manager");
                  const isUpdating = updatingId === row.id;
                  const isDeleting = deletingId === row.id;
                  const badges = getUserBadges(row);
                  return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-ink">{formatUsernameLabel(row)}</td>
                      <td className="px-4 py-3 text-ink">{formatNameLabel(row)}</td>
                      <td className="px-4 py-3 text-ink-muted">{row.email || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {badges.length === 0 ? (
                            <span className="text-xs text-ink-muted">None</span>
                          ) : (
                            badges.map((badge) => (
                              <span
                                key={`${row.id}-${badge}`}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-ink"
                              >
                                {formatRoleLabel(badge)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveManager(row)}
                            disabled={isManager || isUpdating || isDeleting}
                            aria-label="Approve manager"
                            title={isManager ? "Manager approved" : "Approve manager"}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-muted hover:text-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <UserCheck size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(row)}
                            disabled={isUpdating || isDeleting}
                            aria-label="Delete user"
                            title="Delete user"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-muted hover:text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </main>
  );
};

export default AdminPage;
