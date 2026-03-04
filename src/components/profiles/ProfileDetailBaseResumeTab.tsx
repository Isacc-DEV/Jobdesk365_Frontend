import { useRef, useState } from "react";
import { Eye } from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";
import { renderResumeTemplate } from "../../lib/resumeTemplateRenderer";
import {
  openPreviewWindow,
  wrapHtmlIfNeeded,
  writePreviewError,
  writePreviewHtml
} from "../../lib/previewWindow";

const TEMPLATE_ENDPOINT = API_BASE ? `${API_BASE}/templates` : "/templates";

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
  addEducation,
  removeEducation,
  updateEducation,
  onExperienceDateBlur,
  resumeDateErrors,
  updateResumeForm,
  onImportJson,
  onExportJson,
  templateId,
  templateTitle
}) => {
  const fileInputRef = useRef(null);
  const [importError, setImportError] = useState("");
  const [previewError, setPreviewError] = useState("");

  const splitLines = (value) =>
    String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const buildTemplateResume = () => {
    const experienceItems = Array.isArray(resumeForm.experience) ? resumeForm.experience : [];
    const educationItems = Array.isArray(resumeForm.education) ? resumeForm.education : [];
    const skills = (Array.isArray(resumeForm.skills) ? resumeForm.skills : [])
      .map((skill) => String(skill || "").trim())
      .filter(Boolean);

    return {
      Profile: {
        name: resumeForm.name || "",
        headline: resumeForm.headline || "",
        contact: {
          location: resumeForm.location || "",
          email: resumeForm.email || "",
          phone: resumeForm.phone || "",
          linkedin: resumeForm.linkedin || ""
        }
      },
      summary: { text: resumeForm.summary || "" },
      workExperience: experienceItems.map((exp) => ({
        companyTitle: exp?.companyName || "",
        roleTitle: exp?.roleTitle || "",
        employmentType: exp?.employmentType || "",
        location: exp?.location || "",
        startDate: exp?.startDate || "",
        endDate: exp?.isPresent ? "Present" : exp?.endDate || "",
        bullets: splitLines(exp?.bullets)
      })),
      education: educationItems.map((edu) => ({
        institution: edu?.institution || "",
        degree: edu?.degree || "",
        field: edu?.field || "",
        date: edu?.date || "",
        coursework: splitLines(edu?.coursework)
      })),
      skills: { raw: skills }
    };
  };

  const fetchTemplateCode = async () => {
    if (!templateId) {
      if (templateTitle) {
        throw new Error(`Template "${templateTitle}" is not available for this profile.`);
      }
      throw new Error("No resume template selected for this profile.");
    }
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token.");
    }
    const res = await fetch(`${TEMPLATE_ENDPOINT}/${templateId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      throw new Error("Authentication required.");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Unable to load template (${res.status}).`);
    }
    const data = await res.json();
    const code = typeof data?.code === "string" ? data.code : "";
    if (!code.trim()) {
      throw new Error(
        templateTitle ? `Template "${templateTitle}" HTML is empty.` : "Template HTML is empty."
      );
    }
    return code;
  };

  const handlePreview = async () => {
    setPreviewError("");
    const popup = openPreviewWindow();
    if (!popup) {
      setPreviewError("Popup blocked. Please allow popups and try again.");
      return;
    }
    try {
      const templateCode = await fetchTemplateCode();
      const resumePayload = buildTemplateResume();
      const rendered = renderResumeTemplate(templateCode, resumePayload);
      const html = wrapHtmlIfNeeded(rendered || templateCode);
      writePreviewHtml(popup, html);
    } catch (err: any) {
      const message = err?.message || "Unable to open preview.";
      setPreviewError(message);
      writePreviewError(popup, message);
    }
  };

  const handleImportClick = () => {
    setImportError("");
    setPreviewError("");
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
    } catch {
      setImportError("Invalid JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const skills = Array.isArray(resumeForm.skills) ? resumeForm.skills : [];
  const experienceItems = Array.isArray(resumeForm.experience) ? resumeForm.experience : [];
  const educationItems = Array.isArray(resumeForm.education) ? resumeForm.education : [];
  const getDateError = (id, field) => resumeDateErrors?.[`${id}:${field}`] || "";

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
            void handlePreview();
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
      {previewError ? <div className="text-xs text-red-600">{previewError}</div> : null}

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
                <div className="space-y-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Start Date (MM/YY)"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    value={exp.startDate}
                    onChange={(event) => updateExperience(exp.id, "startDate", event.target.value)}
                    onBlur={() => onExperienceDateBlur?.(exp.id, "startDate")}
                  />
                  {getDateError(exp.id, "startDate") ? (
                    <div className="text-xs text-red-600">{getDateError(exp.id, "startDate")}</div>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="End Date (MM/YY or Present)"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40 disabled:bg-gray-50 disabled:text-ink-muted"
                    value={exp.isPresent ? "Present" : exp.endDate}
                    onChange={(event) => updateExperience(exp.id, "endDate", event.target.value)}
                    onBlur={() => onExperienceDateBlur?.(exp.id, "endDate")}
                    disabled={exp.isPresent}
                  />
                  {getDateError(exp.id, "endDate") ? (
                    <div className="text-xs text-red-600">{getDateError(exp.id, "endDate")}</div>
                  ) : null}
                </div>
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Education</h3>
          <button
            type="button"
            onClick={addEducation}
            className="text-sm font-semibold text-accent-primary hover:underline"
          >
            Add Education
          </button>
        </div>
        <div className="space-y-4">
          {educationItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-ink-muted">
              No education added yet.
            </div>
          ) : null}
          {educationItems.map((edu) => (
            <div key={edu.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-ink">Education</h4>
                <button
                  type="button"
                  onClick={() => removeEducation(edu.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Remove Education
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Institution"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={edu.institution}
                  onChange={(event) => updateEducation(edu.id, "institution", event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Degree"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={edu.degree}
                  onChange={(event) => updateEducation(edu.id, "degree", event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Field of Study"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={edu.field}
                  onChange={(event) => updateEducation(edu.id, "field", event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Date"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  value={edu.date}
                  onChange={(event) => updateEducation(edu.id, "date", event.target.value)}
                />
              </div>
              <textarea
                rows={3}
                placeholder="Coursework (one per line)"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={edu.coursework}
                onChange={(event) => updateEducation(edu.id, "coursework", event.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProfileDetailBaseResumeTab;
