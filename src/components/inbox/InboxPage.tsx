import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  CheckSquare,
  ChevronDown,
  Mail,
  RefreshCw,
  Settings,
  Trash2
} from "lucide-react";

const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "authToken";

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString();
};

const normalizeAccount = (account) => ({
  id: account.email_account_id,
  email: account.email_address || "Unknown",
  unread: Number(account.unread_count || 0),
  status: account.status || "",
  profileId: account.profile_id,
  profileName: account.profile_name || ""
});

const normalizeEmail = (email) => ({
  id: email.id,
  accountId: email.email_account_id,
  from: email.from_email || "Unknown sender",
  subject: email.subject || email.snippet || "(No subject)",
  time: formatTimestamp(email.received_at),
  unread: Boolean(email.is_unread)
});

const InboxPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState(null);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState(null);

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
      const res = await fetch(`${API_BASE}/email/accounts`, {
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
        throw new Error(`Failed to load accounts (${res.status})`);
      }
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setAccounts(items.map(normalizeAccount).filter((item) => item.id));
    } catch (err) {
      if (err.name !== "AbortError") {
        setAccountsError(err.message || "Unable to load accounts.");
        setAccounts([]);
      }
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadEmails = useCallback(async (accountId, signal) => {
    if (!accountId) {
      setEmails([]);
      return;
    }
    const token = typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
    if (!token) {
      setEmailsError("Missing token");
      setEmails([]);
      setEmailsLoading(false);
      return;
    }

    try {
      setEmailsLoading(true);
      setEmailsError(null);
      const res = await fetch(
        `${API_BASE}/email/messages?account_id=${encodeURIComponent(accountId)}`,
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
        throw new Error(`Failed to load emails (${res.status})`);
      }
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setEmails(items.map(normalizeEmail));
    } catch (err) {
      if (err.name !== "AbortError") {
        setEmailsError(err.message || "Unable to load emails.");
        setEmails([]);
      }
    } finally {
      setEmailsLoading(false);
    }
  }, []);

  const syncEmails = useCallback(async (accountId) => {
    if (!accountId) return null;
    const token = typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
    if (!token) {
      setEmailsError("Missing token");
      return null;
    }

    const res = await fetch(
      `${API_BASE}/email/sync?account_id=${encodeURIComponent(accountId)}`,
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
      throw new Error(`Failed to sync emails (${res.status})`);
    }
    return res.json();
  }, []);

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
      setEmails([]);
      return;
    }
    const controller = new AbortController();
    loadEmails(activeAccountId, controller.signal);
    return () => controller.abort();
  }, [activeAccountId, loadEmails]);

  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0];
  const unreadCount = emails.length > 0
    ? emails.filter((email) => email.accountId === activeAccount?.id && email.unread).length
    : activeAccount?.unread ?? 0;

  const filteredEmails = emails.filter((email) => email.accountId === activeAccount?.id);
  const visibleEmails = activeFilter === "Unread"
    ? filteredEmails.filter((email) => email.unread)
    : filteredEmails;

  const filters = ["All", "Unread", "Important", "Interview"];

  const handleConnectEmail = () => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/profiles");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleSync = async () => {
    if (!activeAccountId) return;
    try {
      setEmailsError(null);
      setEmailsLoading(true);
      await syncEmails(activeAccountId);
      await loadAccounts();
      await loadEmails(activeAccountId);
    } catch (err) {
      setEmailsError(err.message || "Unable to sync emails.");
    } finally {
      setEmailsLoading(false);
    }
  };

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <aside className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Email Accounts
            </div>
            <div className="mt-4 space-y-2">
              {accountsLoading ? (
                <div className="text-sm text-ink-muted">Loading accounts...</div>
              ) : accountsError ? (
                <div className="text-sm text-red-600">Couldn&apos;t load accounts.</div>
              ) : accounts.length === 0 ? (
                <div className="text-sm text-ink-muted">No connected accounts yet.</div>
              ) : (
                accounts.map((account) => {
                  const isActive = account.id === activeAccountId;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setActiveAccountId(account.id)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-accent-primary/10 text-accent-primary"
                          : "text-ink-muted hover:text-ink hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isActive ? "bg-accent-primary" : "bg-gray-300"
                          }`}
                        />
                        {account.email}
                      </span>
                      <span className="text-xs text-ink-muted">({account.unread})</span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={handleConnectEmail}
              className="mt-4 w-full rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm font-semibold text-accent-primary hover:bg-white"
            >
              + Connect email
            </button>
          </aside>

          <section className="flex flex-col gap-4">
            <header>
              <h1 className="text-2xl font-semibold text-ink">Inbox</h1>
              <p className="text-sm text-ink-muted">
                {activeAccount?.email || "No account selected"} - {unreadCount} unread
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-2">
              {filters.map((label) => {
                const isActive = activeFilter === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveFilter(label)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-accent-primary text-white"
                        : "bg-gray-100 text-ink-muted hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  <CheckSquare size={16} />
                  Select
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  <Archive size={16} />
                  Archive
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  <Mail size={16} />
                  Mark read
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSync}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  <RefreshCw size={16} />
                  Sync
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  <Settings size={16} />
                  Settings
                </button>
              </div>
            </div>

            {!activeAccount ? (
              <div className="rounded-2xl border border-border bg-white p-6 text-center">
                <p className="text-sm text-ink-muted">Connect an email account to view your inbox.</p>
                <button
                  type="button"
                  onClick={handleConnectEmail}
                  className="mt-4 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Go to profiles
                </button>
              </div>
            ) : emailsLoading ? (
              <div className="rounded-2xl border border-border bg-white p-6 text-center">
                <p className="text-sm text-ink-muted">Loading emails...</p>
              </div>
            ) : emailsError ? (
              <div className="rounded-2xl border border-border bg-white p-6 text-center">
                <p className="text-sm text-red-600">Couldn&apos;t load emails.</p>
                <button
                  type="button"
                  onClick={handleSync}
                  className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  Try again
                </button>
              </div>
            ) : visibleEmails.length === 0 ? (
              <div className="rounded-2xl border border-border bg-white p-6 text-center">
                <p className="text-sm text-ink-muted">No emails in this inbox.</p>
                <button
                  type="button"
                  onClick={handleSync}
                  className="mt-4 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Sync now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleEmails.map((email) => (
                  <div
                    key={email.id}
                    className="rounded-2xl border border-border bg-white px-5 py-4 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-border"
                        aria-label={`Select email from ${email.from}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              email.unread ? "font-semibold text-ink" : "text-ink"
                            }`}
                          >
                            {email.from}
                          </span>
                          {email.unread ? (
                            <span className="h-2 w-2 rounded-full bg-accent-primary" />
                          ) : null}
                        </div>
                        <p
                          className={`text-sm ${
                            email.unread ? "font-semibold text-ink" : "text-ink"
                          }`}
                        >
                          {email.subject}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {activeAccount?.email} - {email.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default InboxPage;
