import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { requestsService } from "../../services/requestsService";
import { useUser } from "../../hooks/useUser";

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toFixed(2)}`;
};

const formatRate = (value) => formatMoney(value);

const TalentCard = ({ talent }) => {
  const name = talent?.name || talent?.display_name || talent?.email || "Unknown";
  const imageUrl = talent?.img_url || talent?.image || talent?.photo_link || "";
  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="relative h-1/2 w-full bg-gray-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-ink-muted">
            No image
          </div>
        )}
      </div>
      <div className="flex h-1/2 flex-col justify-between p-4">
        <div>
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="mt-2 text-xs text-ink-muted line-clamp-3">
            {talent?.bio || "No bio provided yet."}
          </p>
        </div>
        <div className="text-xs font-semibold text-ink">
          {formatRate(talent?.rate)}
        </div>
      </div>
    </div>
  );
};

const TalentsPage = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin") || roles.includes("manager");
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formRole, setFormRole] = useState("caller");
  const [identity, setIdentity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [suggestError, setSuggestError] = useState("");

  const loadTalents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [callerItems, bidderItems] = await Promise.all([
        requestsService.listTalents("caller"),
        requestsService.listTalents("bidder")
      ]);
      const withRoles = [
        ...callerItems.map((item) => ({ ...item, role: item.role || "caller" })),
        ...bidderItems.map((item) => ({ ...item, role: item.role || "bidder" }))
      ];
      const unique = new Map();
      withRoles.forEach((item) => {
        const key = `${item.id}-${item.role}`;
        if (!unique.has(key)) unique.set(key, item);
      });
      setTalents(Array.from(unique.values()));
    } catch (err) {
      setError(err?.message || "Unable to load talents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTalents();
  }, [loadTalents]);

  useEffect(() => {
    if (!isAdmin) return;
    const value = identity.trim();
    setSelectedUserId("");
    if (value.length < 2) {
      setSuggestions([]);
      setSuggestError("");
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        setSuggestLoading(true);
        setSuggestError("");
        const items = await requestsService.searchUsers(value);
        setSuggestions(items);
      } catch (err) {
        setSuggestError(err?.message || "Unable to load suggestions.");
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [identity, isAdmin]);

  const handleAddTalent = async () => {
    if (!identity.trim()) {
      setFormError("Enter an email or username.");
      return;
    }
    try {
      setSubmitting(true);
      setFormError("");
      const value = identity.trim();
      const payload = selectedUserId
        ? { role: formRole, user_id: selectedUserId }
        : value.includes("@")
        ? { role: formRole, email: value }
        : { role: formRole, username: value };
      await requestsService.createTalent(payload);
      setIdentity("");
      setSelectedUserId("");
      setSuggestions([]);
      await loadTalents();
    } catch (err) {
      setFormError(err?.message || "Unable to add talent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Hire Talents</h1>
            <p className="text-sm text-ink-muted">Caller and bidder profiles.</p>
          </div>
          <button
            type="button"
            onClick={loadTalents}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {isAdmin ? (
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[160px_1fr_auto] md:items-end">
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted uppercase tracking-[0.18em]">
                Role
                <select
                  className="mt-1 rounded-lg border border-border px-3 py-2 text-sm text-ink"
                  value={formRole}
                  onChange={(event) => setFormRole(event.target.value)}
                  disabled={submitting}
                >
                  <option value="caller">Caller</option>
                  <option value="bidder">Bidder</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted uppercase tracking-[0.18em]">
                User (email or username)
                <div className="relative">
                  <input
                    value={identity}
                    onChange={(event) => setIdentity(event.target.value)}
                    placeholder="user@email.com or username"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                    disabled={submitting}
                  />
                  {(suggestLoading || suggestions.length > 0 || suggestError) && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-border bg-white shadow-lg">
                      {suggestLoading ? (
                        <div className="px-3 py-2 text-xs text-ink-muted">Searching...</div>
                      ) : suggestError ? (
                        <div className="px-3 py-2 text-xs text-red-600">{suggestError}</div>
                      ) : suggestions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-ink-muted">No matches</div>
                      ) : (
                        <div className="max-h-48 overflow-auto">
                          {suggestions.map((item) => {
                            const label =
                              item.username ||
                              item.email ||
                              item.display_name ||
                              item.id;
                            const sub = item.email && item.username ? item.email : item.display_name;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setIdentity(item.username || item.email || "");
                                  setSelectedUserId(item.id);
                                  setSuggestions([]);
                                }}
                                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs text-ink hover:bg-gray-50"
                              >
                                <span className="font-semibold text-ink">{label}</span>
                                {sub ? (
                                  <span className="text-[11px] text-ink-muted">{sub}</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <button
                type="button"
                onClick={handleAddTalent}
                disabled={submitting}
                className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add talent"}
              </button>
            </div>
            {formError ? (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
            Loading talents...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : talents.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
            No talents yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {talents.map((talent) => (
              <TalentCard key={`${talent.id}-${talent.role}`} talent={talent} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default TalentsPage;
