import { useMemo, useState } from "react";
import {
  Archive,
  CheckSquare,
  ChevronDown,
  Mail,
  RefreshCw,
  Settings,
  Trash2
} from "lucide-react";

const InboxPage = () => {
  const accounts = useMemo(
    () => [
      { id: "acc-1", email: "james@outlook.com", unread: 24 },
      { id: "acc-2", email: "robin@gmail.com", unread: 3 },
      { id: "acc-3", email: "hr@company.com", unread: 0 }
    ],
    []
  );

  const [activeAccountId, setActiveAccountId] = useState(accounts[0]?.id);
  const [activeFilter, setActiveFilter] = useState("All");

  const emails = useMemo(
    () => [
      {
        id: "e1",
        accountId: "acc-1",
        from: "Azure Security Alert",
        subject: "Unusual sign-in activity detected",
        time: "2m ago",
        unread: true
      },
      {
        id: "e2",
        accountId: "acc-1",
        from: "Project Team",
        subject: "Weekly project update",
        time: "Today",
        unread: true
      },
      {
        id: "e3",
        accountId: "acc-1",
        from: "Jane Smith",
        subject: "Lunch tomorrow?",
        time: "10:45 AM",
        unread: false
      },
      {
        id: "e4",
        accountId: "acc-2",
        from: "Marketing Newsletter",
        subject: "Latest trends in digital marketing",
        time: "Yesterday",
        unread: false
      },
      {
        id: "e5",
        accountId: "acc-2",
        from: "Meeting Reminder",
        subject: "Team meeting at 2 PM",
        time: "Friday",
        unread: false
      }
    ],
    []
  );

  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0];
  const unreadCount = emails.filter(
    (email) => email.accountId === activeAccount?.id && email.unread
  ).length;

  const filteredEmails = emails.filter((email) => email.accountId === activeAccount?.id);
  const visibleEmails = activeFilter === "Unread"
    ? filteredEmails.filter((email) => email.unread)
    : filteredEmails;

  const filters = ["All", "Unread", "Important", "Interview"];

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <aside className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Email Accounts
            </div>
            <div className="mt-4 space-y-2">
              {accounts.map((account) => {
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
              })}
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm font-semibold text-accent-primary hover:bg-white"
            >
              + Connect email
            </button>
          </aside>

          <section className="flex flex-col gap-4">
            <header>
              <h1 className="text-2xl font-semibold text-ink">Inbox</h1>
              <p className="text-sm text-ink-muted">
                {activeAccount?.email} · {unreadCount} unread
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

            {visibleEmails.length === 0 ? (
              <div className="rounded-2xl border border-border bg-white p-6 text-center">
                <p className="text-sm text-ink-muted">No emails in this inbox.</p>
                <button
                  type="button"
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
                          {activeAccount?.email} · {email.time}
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