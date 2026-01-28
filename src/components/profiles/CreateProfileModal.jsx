import { useState } from "react";
import Modal from "../common/Modal";

const defaultForm = {
  name: "",
  description: "",
  templateId: ""
};

const CreateProfileModal = ({ open, onClose, onCreate, templates, templatesLoading, templatesError }) => {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    try {
      setSubmitting(true);
      setError("");
      await onCreate?.(form);
      setForm(defaultForm);
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
            {submitting ? "Creating…" : "Create"}
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
          {templatesLoading ? (
            <span className="text-xs text-ink-muted">Loading templates...</span>
          ) : null}
          {templatesError ? (
            <span className="text-xs text-red-600">{templatesError}</span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink">Description</label>
          <textarea
            className="w-full rounded-lg border border-border px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </Modal>
  );
};

export default CreateProfileModal;
