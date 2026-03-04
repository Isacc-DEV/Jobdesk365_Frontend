import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import Modal from "../common/Modal";

const defaultForm = {
  name: "",
  description: "",
  templateId: "",
  ownerUserId: ""
};

const CreateProfileModal = ({
  open,
  onClose,
  onCreate,
  templates,
  templatesLoading,
  templatesError,
  requireOwnerSelection = false,
  ownerQuery = "",
  ownerOptions = [],
  ownerLoading = false,
  ownerError = "",
  onOwnerQueryChange
}) => {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

  const selectedOwner = ownerOptions.find(
    (item) => String(item?.id || "") === String(form.ownerUserId || "")
  );

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      setError("Name is required");
      return;
    }
    if (!form.templateId) {
      setError("Template is required");
      return;
    }
    if (requireOwnerSelection && !form.ownerUserId) {
      setError("Profile owner is required");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await onCreate?.(form);
      setForm(defaultForm);
      setOwnerMenuOpen(false);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Unable to create profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) {
          setForm(defaultForm);
          setOwnerMenuOpen(false);
          onClose?.();
        }
      }}
      title="Create Profile"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (!submitting) {
                setForm(defaultForm);
                setOwnerMenuOpen(false);
                onClose?.();
              }
            }}
            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-profile-form"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      }
    >
      <form id="create-profile-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink">Profile name *</label>
          <input
            type="text"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>

        {requireOwnerSelection ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink">Profile owner (username) *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOwnerMenuOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              >
                <span className={selectedOwner ? "text-ink" : "text-ink-muted"}>
                  {selectedOwner?.username || "Select profile owner"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-ink-muted transition-transform ${ownerMenuOpen ? "rotate-180" : "rotate-0"}`}
                />
              </button>

              {ownerMenuOpen ? (
                <div className="absolute z-30 mt-2 w-full rounded-lg border border-border bg-white shadow-lg">
                  <div className="border-b border-border px-2 py-2">
                    <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                      <Search size={14} className="text-ink-muted" />
                      <input
                        type="text"
                        className="w-full border-0 bg-transparent text-sm focus:outline-none"
                        value={ownerQuery}
                        onChange={(e) => {
                          onOwnerQueryChange?.(e.target.value);
                          update("ownerUserId", "");
                        }}
                        placeholder="Search username"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="max-h-44 overflow-y-auto">
                    {ownerOptions.length ? (
                      ownerOptions.map((user) => {
                        const userId = user?.id ? String(user.id) : "";
                        const username = user?.username ? String(user.username) : "unknown";
                        const subtitle = [user?.display_name, user?.email].filter(Boolean).join(" · ");
                        const active = form.ownerUserId === userId;
                        return (
                          <button
                            key={userId || username}
                            type="button"
                            onClick={() => {
                              update("ownerUserId", userId);
                              onOwnerQueryChange?.(username);
                              setOwnerMenuOpen(false);
                            }}
                            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors ${
                              active
                                ? "bg-accent-primary/10 text-accent-primary"
                                : "text-ink hover:bg-gray-50"
                            }`}
                          >
                            <span className="font-semibold">{username}</span>
                            {subtitle ? <span className="text-xs text-ink-muted">{subtitle}</span> : null}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-ink-muted">
                        Type username to search and select a profile owner.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {ownerLoading ? <span className="text-xs text-ink-muted">Searching users...</span> : null}
            {ownerError ? <span className="text-xs text-red-600">{ownerError}</span> : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink">Template *</label>
          <select
            className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={form.templateId}
            onChange={(e) => update("templateId", e.target.value)}
            required
          >
            <option value="">Select a template</option>
            {templates?.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
          {templatesLoading ? <span className="text-xs text-ink-muted">Loading templates...</span> : null}
          {templatesError ? <span className="text-xs text-red-600">{templatesError}</span> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink">Description</label>
          <textarea
            className="w-full rounded-lg border border-border px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        {requireOwnerSelection && form.ownerUserId ? (
          <p className="text-xs text-ink-muted">
            Selected owner: {selectedOwner?.username || form.ownerUserId}
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </Modal>
  );
};

export default CreateProfileModal;
