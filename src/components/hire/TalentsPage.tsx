import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { requestsService } from "../../services/requestsService";
import { useUser } from "../../hooks/useUser";
import { BACKEND_ORIGIN } from "../../config";

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toFixed(2)}`;
};

const formatRoleLabel = (role) => {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "bidder") return "Bidder";
  if (normalizedRole === "caller") return "Caller";
  if (!normalizedRole) return "-";
  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
};

const formatRate = (value, role) => {
  const base = formatMoney(value);
  if (base === "-") return base;
  const normalizedRole = String(role || "").toLowerCase();
  const suffix = normalizedRole === "caller" ? "/minute" : "/application";
  return `${base}${suffix}`;
};

const getTalentUserId = (talent) => talent?.user_id || talent?.id || "";

const resolveTalentImageUrl = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = BACKEND_ORIGIN;
  if (!base) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
};

const TalentCard = ({ talent, canEditOwnCard, canAdminAdjust, onEditOwn, onAdjustCard }) => {
  const name = talent?.name || talent?.display_name || talent?.email || "Unknown";
  const imageUrl = resolveTalentImageUrl(talent?.img_url || talent?.image || talent?.photo_link || "");
  const role = talent?.role || talent?.talent_role;
  return (
    <div className="flex h-72 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="relative h-1/2 w-full bg-gray-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            priority
            unoptimized
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
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-ink">
              {formatRoleLabel(role)}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-muted line-clamp-3">
            {talent?.bio || "No bio provided yet."}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-ink">
            {formatRate(talent?.rate, role)}
          </div>
          {canEditOwnCard || canAdminAdjust ? (
            <div className="mt-3 flex items-center gap-2">
              {canEditOwnCard ? (
                <button
                  type="button"
                  onClick={() => onEditOwn?.(talent)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted hover:text-ink"
                >
                  Edit my card
                </button>
              ) : null}
              {canAdminAdjust ? (
                <button
                  type="button"
                  onClick={() => onAdjustCard?.(talent)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted hover:text-ink"
                >
                  Adjust card
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const TalentsPage = () => {
  const { user } = useUser();
  const roleScope = Array.isArray(user?.roles) ? user.roles : undefined;
  const roles = roleScope || [];
  const isAdmin = roles.includes("admin");
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("self");
  const [editorTarget, setEditorTarget] = useState(null);
  const [editorBio, setEditorBio] = useState("");
  const [editorImageFile, setEditorImageFile] = useState(null);
  const [editorImageName, setEditorImageName] = useState("");
  const [editorRate, setEditorRate] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  const loadTalents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [callerItems, bidderItems] = await Promise.all([
        requestsService.listTalents("caller", { roles: roleScope }),
        requestsService.listTalents("bidder", { roles: roleScope })
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
  }, [roleScope]);

  useEffect(() => {
    loadTalents();
  }, [loadTalents]);

  useEffect(() => {
    if (!isAdmin) return;
    const value = identity.trim();
    if (value.length < 2) {
      setSuggestions([]);
      setSuggestError("");
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        setSuggestLoading(true);
        setSuggestError("");
        const items = await requestsService.searchUsers(value, { roles: roleScope });
        setSuggestions(items);
      } catch (err) {
        setSuggestError(err?.message || "Unable to load suggestions.");
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [identity, isAdmin, roleScope]);

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
      await requestsService.createTalent(payload, { roles: roleScope });
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

  const openSelfEditor = (talent) => {
    setEditorMode("self");
    setEditorTarget(talent);
    setEditorBio(talent?.bio || "");
    setEditorImageFile(null);
    setEditorImageName("");
    setEditorRate(talent?.rate === null || talent?.rate === undefined ? "" : String(talent.rate));
    setEditorError("");
    setEditorOpen(true);
  };

  const openAdminEditor = (talent) => {
    setEditorMode("admin");
    setEditorTarget(talent);
    setEditorBio("");
    setEditorImageFile(null);
    setEditorImageName("");
    setEditorRate(talent?.rate === null || talent?.rate === undefined ? "" : String(talent.rate));
    setEditorError("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (editorSaving) return;
    setEditorOpen(false);
    setEditorTarget(null);
    setEditorImageFile(null);
    setEditorImageName("");
    setEditorError("");
  };

  const handleEditorFileChange = (event) => {
    const file = event.target?.files?.[0] || null;
    if (!file) {
      setEditorImageFile(null);
      setEditorImageName("");
      return;
    }
    if (!String(file.type || "").startsWith("image/")) {
      setEditorError("Please choose an image file.");
      setEditorImageFile(null);
      setEditorImageName("");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditorError("Please upload an image smaller than 5MB.");
      setEditorImageFile(null);
      setEditorImageName("");
      return;
    }
    setEditorError("");
    setEditorImageFile(file);
    setEditorImageName(file.name || "image");
  };

  const handleEditorSave = async () => {
    if (!editorTarget?.role) return;
    const role = String(editorTarget.role).toLowerCase();
    try {
      setEditorSaving(true);
      setEditorError("");
      if (editorMode === "admin") {
        const rateText = String(editorRate || "").trim();
        if (!rateText) {
          setEditorError("Price is required.");
          setEditorSaving(false);
          return;
        }
        const parsedRate = Number(rateText);
        if (!Number.isFinite(parsedRate) || parsedRate < 0) {
          setEditorError("Rate must be a number greater than or equal to 0.");
          setEditorSaving(false);
          return;
        }
        await requestsService.updateTalentCardByAdmin(
          String(getTalentUserId(editorTarget)),
          { role, rate: parsedRate },
          {
            roles: roleScope
          }
        );
      } else {
        if (editorImageFile) {
          const formData = new FormData();
          formData.append("role", role);
          formData.append("image", editorImageFile);
          await requestsService.uploadMyTalentCardImage(formData, {
            roles: roleScope
          });
        }
        await requestsService.updateMyTalentCard(
          {
            role,
            bio: String(editorBio || "").trim()
          },
          {
            roles: roleScope
          }
        );
      }
      await loadTalents();
      closeEditor();
    } catch (err) {
      setEditorError(err?.message || "Unable to update talent card.");
    } finally {
      setEditorSaving(false);
    }
  };

  const renderEditorFields = () => {
    if (editorMode === "admin") {
      return (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink">
            Price ({String(editorTarget?.role || "").toLowerCase() === "caller" ? "per minute" : "per application"})
          </label>
          <input
            className="h-11 w-full rounded-xl border border-border px-3 text-sm text-ink"
            value={editorRate}
            onChange={(event) => setEditorRate(event.target.value)}
            placeholder="0.00"
          />
        </div>
      );
    }

    return (
      <>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink">Card image</label>
          <input
            type="file"
            accept="image/*"
            className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink"
            onChange={handleEditorFileChange}
          />
          {editorImageName ? (
            <p className="text-xs text-ink-muted">Selected: {editorImageName}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink">Bio</label>
          <textarea
            className="h-24 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm text-ink"
            value={editorBio}
            onChange={(event) => setEditorBio(event.target.value)}
            placeholder="Short bio"
          />
        </div>
      </>
    );
  };

  return (
    <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Talents</h1>
            <p className="text-sm text-ink-muted">Worker cards by badge (Caller and Bidder).</p>
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
                    onChange={(event) => {
                      setIdentity(event.target.value);
                      setSelectedUserId("");
                    }}
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
            {talents.map((talent) => {
              const isOwnCard =
                user?.id && String(getTalentUserId(talent)) === String(user.id);
              return (
                <TalentCard
                  key={`${talent.id}-${talent.role}`}
                  talent={talent}
                  canEditOwnCard={isOwnCard}
                  canAdminAdjust={isAdmin}
                  onEditOwn={openSelfEditor}
                  onAdjustCard={openAdminEditor}
                />
              );
            })}
          </div>
        )}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                {editorMode === "admin" ? "Adjust talent card" : "Edit my talent card"}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="text-sm text-ink-muted hover:text-ink"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {renderEditorFields()}
              {editorError ? (
                <p className="text-sm text-red-600">{editorError}</p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditorSave}
                  disabled={editorSaving}
                  className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {editorSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default TalentsPage;
