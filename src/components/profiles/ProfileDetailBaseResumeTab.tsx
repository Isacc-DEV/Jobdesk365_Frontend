import { useRef, useState } from "react";
import { Eye } from "lucide-react";

const ProfileDetailBaseResumeTab = ({
  visible,
  resumeForm,
  skillsInput,
  setSkillsInput,
  handleSkillKeyDown,
  removeSkill,
  addExperience,
  removeExperience,
  updateExperience,
  updateResumeForm,
  onImportJson,
  onExportJson
}) => {
  const fileInputRef = useRef(null);
  const [importError, setImportError] = useState("");
  const buildPreviewHtml = () => {
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const contactParts = [
      resumeForm.location,
      resumeForm.email,
      resumeForm.phone,
      resumeForm.linkedin
    ]
      .filter(Boolean)
      .map(escapeHtml);
    const contactLine = contactParts.length ? contactParts.join(" | ") : "Contact info not set.";

    const headline = resumeForm.headline ? `<p>${escapeHtml(resumeForm.headline)}</p>` : "";
    const summary = resumeForm.summary
      ? `<p>${escapeHtml(resumeForm.summary).replace(/\n/g, "<br />")}</p>`
      : "";

    const skills = Array.isArray(resumeForm.skills)
      ? resumeForm.skills
          .filter(Boolean)
          .map(
            (skill) =>
              `<span class="chip">${escapeHtml(skill)}</span>`
          )
          .join("")
      : "";

    const experienceItems = Array.isArray(resumeForm.experience) ? resumeForm.experience : [];
    const experience = experienceItems.length
      ? experienceItems
          .map((exp) => {
            const endLabel = exp?.isPresent ? "Present" : exp?.endDate || "";
            const range = [exp?.startDate, endLabel].filter(Boolean).join(" - ");
            const bullets = exp?.bullets
              ? `<p class="muted">${escapeHtml(exp.bullets).replace(/\n/g, "<br />")}</p>`
              : "";
            const company = exp?.companyName ? ` | ${escapeHtml(exp.companyName)}` : "";
            return `
              <div class="card">
                <div class="title">${escapeHtml(exp?.roleTitle || "Role Title")}${company}</div>
                ${range ? `<div class="muted">${escapeHtml(range)}</div>` : ""}
                ${bullets}
              </div>
            `;
          })
          .join("")
      : `<p class="muted">No experience added yet.</p>`;

    const name = escapeHtml(resumeForm.name || "Resume Preview");

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${name}</title>
    <style>
      body { font-family: "Segoe UI", system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; }
      .wrap { max-width: 900px; margin: 32px auto; padding: 0 24px; }
      .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
      h1 { margin: 0 0 4px; font-size: 24px; }
      h2 { margin: 20px 0 6px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; }
      p { margin: 6px 0; font-size: 14px; line-height: 1.6; }
      .muted { color: #64748b; font-size: 12px; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip { display: inline-flex; padding: 4px 10px; border-radius: 999px; background: #e0e7ff; color: #1d4ed8; font-weight: 600; font-size: 12px; }
      .card { margin-top: 10px; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; }
      .title { font-weight: 600; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="panel">
        <h1>${name}</h1>
        <p class="muted">${contactLine}</p>
        ${headline ? "<h2>Headline</h2>" + headline : ""}
        ${summary ? "<h2>Summary</h2>" + summary : ""}
        <h2>Skills</h2>
        ${skills ? `<div class="chips">${skills}</div>` : `<p class="muted">No skills added yet.</p>`}
        <h2>Experience</h2>
        ${experience}
      </div>
    </div>
  </body>
</html>`;
  };

  const handleImportClick = () => {
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid JSON");
      }
      onImportJson?.(parsed);
      setImportError("");
    } catch (err) {
      setImportError("Invalid JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const skills = Array.isArray(resumeForm.skills) ? resumeForm.skills : [];
  const experienceItems = Array.isArray(resumeForm.experience) ? resumeForm.experience : [];

  return (
    <section className="space-y-6" style={{ display: visible ? "block" : "none" }}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => {
            const html = buildPreviewHtml();
            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const previewWindow = window.open(url, "_blank", "noopener,noreferrer");
            if (!previewWindow) {
              URL.revokeObjectURL(url);
              return;
            }
            window.setTimeout(() => URL.revokeObjectURL(url), 5000);
          }}
          className={`px-3 py-1.5 rounded-lg border border-border text-xs font-semibold transition-colors ${
            "text-ink-muted hover:text-ink"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Eye size={14} />
            Preview
          </span>
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink"
        >
          Import JSON
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink"
        >
          Export JSON
        </button>
      </div>
      {importError ? <div className="text-xs text-red-600">{importError}</div> : null}

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Contact</h3>
        <div className="grid grid-cols-1 gap-4">
          <input
            type="text"
            placeholder="Name"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={resumeForm.name}
            onChange={(event) => updateResumeForm("name", event.target.value)}
          />
          <input
            type="text"
            placeholder="Location"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={resumeForm.location}
            onChange={(event) => updateResumeForm("location", event.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={resumeForm.email}
            onChange={(event) => updateResumeForm("email", event.target.value)}
          />
          <input
            type="text"
            placeholder="Phone"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={resumeForm.phone}
            onChange={(event) => updateResumeForm("phone", event.target.value)}
          />
          <input
            type="url"
            placeholder="LinkedIn"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={resumeForm.linkedin}
            onChange={(event) => updateResumeForm("linkedin", event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Header</h3>
        <input
          type="text"
          placeholder="Headline"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={resumeForm.headline}
          onChange={(event) => updateResumeForm("headline", event.target.value)}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Summary</h3>
        <textarea
          rows={4}
          placeholder="Summary"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={resumeForm.summary}
          onChange={(event) => updateResumeForm("summary", event.target.value)}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Skills</h3>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1 rounded-full bg-accent-primary/10 px-2 py-1 text-xs font-semibold text-accent-primary"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="text-accent-primary/70 hover:text-accent-primary"
              >
                x
              </button>
            </span>
          ))}
          <input
            type="text"
            className="flex-1 min-w-[120px] border-none p-1 text-sm focus:outline-none"
            placeholder="Add a skill"
            value={skillsInput}
            onChange={(event) => setSkillsInput(event.target.value)}
            onKeyDown={handleSkillKeyDown}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Work Experience</h3>
          <button
            type="button"
            onClick={addExperience}
            className="text-sm font-semibold text-accent-primary hover:underline"
          >
            Add Experience
          </button>
        </div>
        <div className="space-y-4">
          {experienceItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-ink-muted">
              No experience added yet.
            </div>
          ) : null}
          {experienceItems.map((exp) => (
            <div key={exp.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-ink">Role</h4>
                <button
                  type="button"
                  onClick={() => removeExperience(exp.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Remove Role
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Company Name"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={exp.companyName}
                  onChange={(event) => updateExperience(exp.id, "companyName", event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Role Title"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={exp.roleTitle}
                  onChange={(event) => updateExperience(exp.id, "roleTitle", event.target.value)}
                />
                <select
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={exp.employmentType}
                  onChange={(event) => updateExperience(exp.id, "employmentType", event.target.value)}
                >
                  <option value="">Employment Type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                </select>
                <input
                  type="date"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={exp.startDate}
                  onChange={(event) => updateExperience(exp.id, "startDate", event.target.value)}
                />
                <input
                  type="date"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={exp.isPresent ? "" : exp.endDate}
                  onChange={(event) => updateExperience(exp.id, "endDate", event.target.value)}
                  disabled={exp.isPresent}
                />
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={exp.isPresent}
                    onChange={(event) => {
                      const isPresent = event.target.checked;
                      updateExperience(exp.id, "isPresent", isPresent);
                      updateExperience(exp.id, "endDate", isPresent ? "Present" : "");
                    }}
                  />
                  Present
                </label>
              </div>
              <textarea
                rows={3}
                placeholder="Bullets"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={exp.bullets}
                onChange={(event) => updateExperience(exp.id, "bullets", event.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProfileDetailBaseResumeTab;
