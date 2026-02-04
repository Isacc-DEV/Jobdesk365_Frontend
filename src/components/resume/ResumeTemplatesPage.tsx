import { useEffect, useMemo, useState } from "react";
import { Eye, FileCode, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";
import { useUser } from "../../hooks/useUser";

type ResumeTemplate = {
  id: string;
  title: string;
  description?: string | null;
  code: string;
  created_at: string;
  updated_at: string;
  profile_count?: number;
  people_count?: number;
};

type TemplateDraft = {
  title: string;
  description: string;
  code: string;
};

type EditorMode = "view" | "edit" | "create";

type BaseResume = {
  Profile?: {
    name?: string;
    headline?: string;
    contact?: {
      location?: string;
      email?: string;
      phone?: string;
      linkedin?: string;
    };
  };
  summary?: { text?: string };
  workExperience?: Array<{
    companyTitle?: string;
    roleTitle?: string;
    employmentType?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    date?: string;
    coursework?: string[];
  }>;
  skills?: { raw?: string[] };
};

const TEMPLATE_ENDPOINT = API_BASE ? `${API_BASE}/templates` : "/templates";

const DEFAULT_TEMPLATE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Resume</title>
  <style>
    body { font-family: "Arial", sans-serif; margin: 32px; color: #0f172a; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 12px; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 2px; color: #475569; }
    p, li { font-size: 13px; line-height: 1.5; }
    .muted { color: #64748b; font-size: 12px; }
    .resume-item { margin-bottom: 12px; }
    .resume-meta { color: #64748b; font-size: 12px; }
    .section { margin-top: 16px; }
  </style>
</head>
<body>
  <header>
    <h1>{{profile.name}}</h1>
    <div class="muted">{{profile.headline}} | {{profile.contact.location}}</div>
    <div class="muted">
      {{profile.contact.email}} | {{profile.contact.phone}} | {{profile.contact.linkedin}}
    </div>
  </header>
  <section class="section">
    <h2>Summary</h2>
    <p>{{summary}}</p>
  </section>
  <section class="section">
    <h2>Experience</h2>
    {{work_experience}}
  </section>
  <section class="section">
    <h2>Education</h2>
    {{education}}
  </section>
  <section class="section">
    <h2>Skills</h2>
    <p>{{skills}}</p>
  </section>
</body>
</html>`;

const EMPTY_PREVIEW_HTML = `<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; padding: 24px; color: #475569;">
  <p>No HTML to preview yet.</p>
</body>
</html>`;

const getEmptyDraft = (): TemplateDraft => ({
  title: "",
  description: "",
  code: ""
});

const normalizeDraft = (template?: ResumeTemplate | null): TemplateDraft => ({
  title: template?.title || "",
  description: template?.description || "",
  code: template?.code || ""
});

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const safeHtml = (value: string) => ({ __html: value });

const isSafeHtml = (value: unknown): value is { __html: string } =>
  Boolean(value && typeof value === "object" && "__html" in (value as Record<string, unknown>));

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const cleanString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const buildWorkExperienceHtml = (items?: BaseResume["workExperience"]) => {
  const list = items ?? [];
  if (!list.length) return "";
  return list
    .map((item) => {
      const title = [item.roleTitle, item.companyTitle]
        .map(cleanString)
        .filter(Boolean)
        .join(" - ");
      const dates = [item.startDate, item.endDate]
        .map(cleanString)
        .filter(Boolean)
        .join(" - ");
      const meta = [item.location, item.employmentType]
        .map(cleanString)
        .filter(Boolean)
        .join(" | ");
      const bullets = (item.bullets ?? []).map(cleanString).filter(Boolean);
      const bulletHtml = bullets.length
        ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
        : "";
      const header = escapeHtml(title || "Role");
      const datesHtml = dates ? `<div class="resume-meta">${escapeHtml(dates)}</div>` : "";
      const metaHtml = meta ? `<div class="resume-meta">${escapeHtml(meta)}</div>` : "";
      return `<div class="resume-item"><div><strong>${header}</strong></div>${datesHtml}${metaHtml}${bulletHtml}</div>`;
    })
    .join("");
};

const buildEducationHtml = (items?: BaseResume["education"]) => {
  const list = items ?? [];
  if (!list.length) return "";
  return list
    .map((item) => {
      const title = [item.degree, item.field].map(cleanString).filter(Boolean).join(" - ");
      const header = [item.institution, title].map(cleanString).filter(Boolean).join(" | ");
      const date = cleanString(item.date);
      const coursework = (item.coursework ?? []).map(cleanString).filter(Boolean);
      const courseworkText = coursework.length ? `Coursework: ${coursework.join(", ")}` : "";
      const dateHtml = date ? `<div class="resume-meta">${escapeHtml(date)}</div>` : "";
      const courseworkHtml = courseworkText
        ? `<div class="resume-meta">${escapeHtml(courseworkText)}</div>`
        : "";
      const label = escapeHtml(header || "Education");
      return `<div class="resume-item"><div><strong>${label}</strong></div>${dateHtml}${courseworkHtml}</div>`;
    })
    .join("");
};

const buildTemplateData = (resume: BaseResume) => {
  const profile = resume.Profile ?? {};
  const contact = profile.contact ?? {};
  const summary = resume.summary ?? {};
  const skills = resume.skills ?? {};

  return {
    profile: {
      name: profile.name || "",
      headline: profile.headline || "",
      contact: {
        location: contact.location || "",
        email: contact.email || "",
        phone: contact.phone || "",
        linkedin: contact.linkedin || ""
      }
    },
    Profile: {
      name: profile.name || "",
      headline: profile.headline || "",
      contact: {
        location: contact.location || "",
        email: contact.email || "",
        phone: contact.phone || "",
        linkedin: contact.linkedin || ""
      }
    },
    summary: { text: summary.text || "" },
    skills: { raw: skills.raw ?? [] },
    work_experience: resume.workExperience ?? [],
    education: resume.education ?? []
  };
};

const getMockResumeData = (): BaseResume => ({
  Profile: {
    name: "Alex Johnson",
    headline: "Senior Software Engineer",
    contact: {
      location: "Austin, TX",
      email: "alex.johnson@example.com",
      phone: "+1 (555) 123-4567",
      linkedin: "linkedin.com/in/alexjohnson"
    }
  },
  summary: {
    text:
      "Senior engineer focused on scalable backend systems, developer tooling, and clean UI."
  },
  workExperience: [
    {
      companyTitle: "Arcadia",
      roleTitle: "Senior Software Engineer",
      employmentType: "Full-time",
      location: "Remote",
      startDate: "2021",
      endDate: "Present",
      bullets: [
        "Built scalable API platform with 99.9% uptime.",
        "Led team of 4 engineers across core services."
      ]
    },
    {
      companyTitle: "Horizon Labs",
      roleTitle: "Software Engineer",
      employmentType: "Full-time",
      location: "Austin, TX",
      startDate: "2018",
      endDate: "2021",
      bullets: ["Shipped customer-facing features in React + Node."]
    }
  ],
  education: [
    {
      institution: "State University",
      degree: "BSc Computer Science",
      field: "Computer Science",
      date: "2018"
    }
  ],
  skills: { raw: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"] }
});

const renderResumeTemplate = (templateHtml: string, resume: BaseResume): string => {
  if (!templateHtml.trim()) return "";
  const data = buildTemplateData(resume);
  return renderMustacheTemplate(templateHtml, data);
};

const renderMustacheTemplate = (template: string, data: Record<string, unknown>) => {
  return renderTemplateWithContext(template, [data]);
};

const renderTemplateWithContext = (template: string, stack: unknown[]): string => {
  let output = "";
  let index = 0;

  while (index < template.length) {
    const openIndex = template.indexOf("{{", index);
    if (openIndex == -1) {
      output += template.slice(index);
      break;
    }
    output += template.slice(index, openIndex);
    const closeIndex = template.indexOf("}}", openIndex + 2);
    if (closeIndex == -1) {
      output += template.slice(openIndex);
      break;
    }
    const tag = template.slice(openIndex + 2, closeIndex).trim();
    index = closeIndex + 2;
    if (!tag) continue;

    const type = tag[0];
    if (type == "#" || type == "^") {
      const name = tag.slice(1).trim();
      if (!name) continue;
      const section = findSectionEnd(template, index, name);
      if (!section) continue;
      const inner = template.slice(index, section.start);
      index = section.end;
      const value = resolvePath(name, stack);
      const truthy = isSectionTruthy(value);

      if (type == "#") {
        if (Array.isArray(value)) {
          if (value.length) {
            value.forEach((item) => {
              output += renderTemplateWithContext(inner, pushContext(stack, item));
            });
          }
        } else if (truthy) {
          output += renderTemplateWithContext(inner, pushContext(stack, value));
        }
      } else if (!truthy) {
        output += renderTemplateWithContext(inner, stack);
      }
      continue;
    }

    if (type == "/") {
      continue;
    }

    const value = resolvePath(tag, stack);
    output += renderValue(value, tag);
  }

  return output;
};

const findSectionEnd = (template: string, fromIndex: number, name: string) => {
  let index = fromIndex;
  let depth = 1;
  while (index < template.length) {
    const openIndex = template.indexOf("{{", index);
    if (openIndex == -1) return null;
    const closeIndex = template.indexOf("}}", openIndex + 2);
    if (closeIndex == -1) return null;
    const tag = template.slice(openIndex + 2, closeIndex).trim();
    index = closeIndex + 2;
    if (!tag) continue;
    const type = tag[0];
    const tagName = type == "#" || type == "^" || type == "/" ? tag.slice(1).trim() : "";
    if (!tagName) continue;
    if ((type == "#" || type == "^") && tagName == name) {
      depth += 1;
    }
    if (type == "/" && tagName == name) {
      depth -= 1;
      if (depth == 0) {
        return { start: openIndex, end: closeIndex + 2 };
      }
    }
  }
  return null;
};

const resolvePath = (path: string, stack: unknown[]) => {
  if (path == ".") return resolveDot(stack);
  const parts = path.split(".");
  for (let i = 0; i < stack.length; i += 1) {
    const value = getPathValue(stack[i], parts);
    if (value !== undefined) return value;
  }
  return undefined;
};

const resolveDot = (stack: unknown[]) => {
  for (let i = 0; i < stack.length; i += 1) {
    const ctx = stack[i];
    if (ctx && typeof ctx === "object" && "." in (ctx as Record<string, unknown>)) {
      return (ctx as Record<string, unknown>)["."];
    }
    if (typeof ctx === "string" || typeof ctx === "number" || typeof ctx === "boolean") {
      return ctx;
    }
  }
  return undefined;
};

const getPathValue = (context: unknown, parts: string[]) => {
  if (!context || typeof context !== "object") return undefined;
  let current: any = context;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
};

const pushContext = (stack: unknown[], value: unknown) => {
  if (value === null || value === undefined) return stack;
  if (value && typeof value === "object") {
    return [value, ...stack];
  }
  return [{ ".": value }, ...stack];
};

const isSectionTruthy = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (isSafeHtml(value)) return Boolean(value.__html);
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "object") return true;
  return Boolean(value);
};

const renderValue = (value: unknown, path: string) => {
  if (isSafeHtml(value)) return value.__html;
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    if (path == "workExperience" || path == "work_experience") {
      return buildWorkExperienceHtml(value as BaseResume["workExperience"]);
    }
    if (path == "education") {
      return buildEducationHtml(value as BaseResume["education"]);
    }
    if (path == "skills.raw") {
      const joined = value.map((item) => cleanString(item)).filter(Boolean).join(", ");
      return escapeHtml(joined);
    }
    const joined = value.map((item) => cleanString(item)).filter(Boolean).join(", ");
    return escapeHtml(joined);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return escapeHtml(record.text);
    if (Array.isArray(record.raw)) {
      const joined = record.raw.map((item) => cleanString(item)).filter(Boolean).join(", ");
      return escapeHtml(joined);
    }
    return "";
  }
  if (typeof value === "boolean") return value ? "true" : "";
  return escapeHtml(String(value));
};

const wrapHtmlIfNeeded = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.startsWith("<!doctype") && !trimmed.startsWith("<html")) {
    return `<!doctype html><html><body>${value}</body></html>`;
  }
  return value;
};

const ResumeTemplatesPage = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin") || roles.includes("manager");
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("view");
  const [draft, setDraft] = useState<TemplateDraft>(getEmptyDraft());
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const listEndpoint = isAdmin ? `${TEMPLATE_ENDPOINT}?scope=all` : TEMPLATE_ENDPOINT;

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || null,
    [templates, selectedId]
  );

  useEffect(() => {
    const loadTemplates = async () => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (!token) {
        setError("Missing token");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const res = await fetch(listEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.status === 401 && typeof window !== "undefined") {
          window.location.href = "/auth";
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load templates.");
        }
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setTemplates(items);
      } catch (err: any) {
        setError(err?.message || "Unable to load templates.");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [listEndpoint]);

  useEffect(() => {
    if (!templates.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !templates.some((item) => item.id === selectedId)) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  useEffect(() => {
    if (mode === "view" && selectedTemplate) {
      setDraft(normalizeDraft(selectedTemplate));
    }
  }, [mode, selectedTemplate]);

  const previewDoc = useMemo(() => {
    const html = mode === "view" ? selectedTemplate?.code || "" : draft.code;
    if (!html.trim()) return EMPTY_PREVIEW_HTML;
    const rendered = renderResumeTemplate(html, getMockResumeData());
    return wrapHtmlIfNeeded(rendered);
  }, [mode, selectedTemplate, draft.code]);

  const startCreate = () => {
    setMode("create");
    setSelectedId(null);
    setDraft({ title: "", description: "", code: DEFAULT_TEMPLATE_HTML });
    setDetailOpen(true);
    setError("");
  };

  const loadTemplateDetail = async (id: string) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError("Missing token");
      return null;
    }
    try {
      setDetailLoading(true);
      const res = await fetch(`${TEMPLATE_ENDPOINT}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/auth";
        return null;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to load template.");
      }
      const data = await res.json();
      setTemplates((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...data } : item))
      );
      return data as ResumeTemplate;
    } catch (err: any) {
      setError(err?.message || "Unable to load template.");
      return null;
    } finally {
      setDetailLoading(false);
    }
  };

  const openView = async (id: string) => {
    setMode("view");
    setSelectedId(id);
    setDetailOpen(true);
    setError("");
    const detail = await loadTemplateDetail(id);
    if (detail) {
      setDraft(normalizeDraft(detail));
    }
  };

  const openEdit = async (id: string) => {
    setMode("edit");
    setSelectedId(id);
    setDetailOpen(true);
    const detail = await loadTemplateDetail(id);
    setDraft(normalizeDraft(detail));
    setError("");
  };
  const openPreviewTab = async (id: string) => {
    if (typeof window === "undefined") return;
    const detail = await loadTemplateDetail(id);
    const html = detail?.code || "";
    if (!html.trim()) {
      setError("Template HTML is empty.");
      return;
    }
    const rendered = renderResumeTemplate(html, getMockResumeData());
    const doc = wrapHtmlIfNeeded(rendered);
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      setError("Popup blocked. Please allow popups and try again.");
      return;
    }
    popup.document.open();
    popup.document.write(doc);
    popup.document.close();
  };


  const closeDetail = () => {
    setDetailOpen(false);
    setMode("view");
    if (selectedTemplate) {
      setDraft(normalizeDraft(selectedTemplate));
    }
  };

  const handleSave = async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError("Missing token");
      return;
    }
    const title = draft.title.trim();
    const code = draft.code.trim();
    if (!title || !code) {
      setError("Template name and HTML are required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      if (mode === "create") {
        const res = await fetch(TEMPLATE_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title,
            description: draft.description.trim() || null,
            code
          })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Unable to create template.");
        }
        const created = await res.json();
        setTemplates((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setMode("view");
      } else if (mode === "edit" && selectedTemplate) {
        const res = await fetch(`${TEMPLATE_ENDPOINT}/${selectedTemplate.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title,
            description: draft.description.trim() || null,
            code
          })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Unable to update template.");
        }
        const updated = await res.json();
        setTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setMode("view");
      }
    } catch (err: any) {
      setError(err?.message || "Unable to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError("Missing token");
      return;
    }
    const confirmed = window.confirm("Delete this template?");
    if (!confirmed) return;
    try {
      setSaving(true);
      setError("");
      const res = await fetch(`${TEMPLATE_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to delete template.");
      }
      const remaining = templates.filter((item) => item.id !== id);
      setTemplates(remaining);
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id ?? null);
      }
      setDetailOpen(false);
    } catch (err: any) {
      setError(err?.message || "Unable to delete template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <header className="flex items-start justify-between gap-4">
          {isAdmin ? (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
            >
              <Plus size={16} />
              New Template
            </button>
          ) : null}
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Templates</h2>
              <p className="text-xs text-ink-muted">{templates.length} total</p>
            </div>
          </div>
          {loading ? (
            <div className="rounded-2xl border border-border bg-white px-4 py-6 text-sm text-ink-muted">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-4 py-6 text-sm text-ink-muted">
              No templates yet. Create one to get started.
            </div>
          ) : (
            <div
              className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition ${
                detailOpen ? "blur-sm pointer-events-none" : ""
              }`}
            >
              {templates.map((template) => {
                const isActive = template.id === selectedId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => void openView(template.id)}
                    className={`group rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isActive ? "ring-2 ring-accent-primary/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Template</p>
                        <h3 className="mt-1 text-base font-semibold text-ink truncate">
                          {template.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openPreviewTab(template.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted hover:text-ink hover:bg-gray-50"
                        title="Open preview"
                        aria-label="Open preview"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                    <div className="mt-3 rounded-xl border border-dashed border-border bg-gray-50 px-3 py-3 text-xs text-ink-muted">
                      {template.description || "No description"}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
                      <div>
                        <span className="font-semibold text-ink">{template.people_count ?? 0}</span> people using
                      </div>
                      <div>
                        <span className="font-semibold text-ink">{template.profile_count ?? 0}</span> profiles using
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                      Updated {formatDate(template.updated_at || template.created_at)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <aside
        aria-hidden={!detailOpen}
        className={`fixed right-0 top-0 z-40 h-screen w-full max-w-3xl transform border-l border-border bg-white shadow-2xl transition-transform duration-300 ${
          detailOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                {mode === "create" ? "Create template" : mode === "edit" ? "Edit template" : "Template"}
              </p>
              <h2 className="text-lg font-semibold text-ink">
                {mode === "view" ? selectedTemplate?.title || "Template" : draft.title || "Untitled"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {mode !== "view" ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-3 py-2 text-sm font-semibold text-white"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => selectedTemplate && openEdit(selectedTemplate.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink hover:bg-gray-50"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              )}
              {mode === "view" && selectedTemplate ? (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedTemplate.id)}
                  className="inline-flex items-center justify-center rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  aria-label="Delete template"
                >
                  <Trash2 size={18} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex items-center justify-center rounded-md border border-border p-2 text-ink-muted hover:text-ink hover:bg-gray-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {mode === "view" ? (
              <>
                <div className="rounded-xl border border-border bg-gray-50 px-4 py-3 text-sm text-ink">
                  {selectedTemplate?.description || "No description provided."}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-ink-muted">Preview</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-border bg-white">
                    {detailLoading ? (
                      <div className="px-4 py-6 text-sm text-ink-muted">Loading preview...</div>
                    ) : (
                      <iframe
                        title="Resume template preview"
                        srcDoc={previewDoc}
                        className="h-[520px] w-full"
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4">
                  <label className="flex flex-col gap-1 text-sm text-ink">
                    Template name
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                      className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Template name"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-ink">
                    Description
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, description: event.target.value }))
                      }
                      className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Template description"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-ink">
                    HTML
                    <textarea
                      rows={12}
                      value={draft.code}
                      onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))}
                      className="rounded-lg border border-border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Paste template HTML"
                    />
                  </label>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-ink-muted">Preview</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-border bg-white">
                    {detailLoading ? (
                      <div className="px-4 py-6 text-sm text-ink-muted">Loading preview...</div>
                    ) : (
                      <iframe
                        title="Resume template preview"
                        srcDoc={previewDoc}
                        className="h-[520px] w-full"
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </main>
  );
};

export default ResumeTemplatesPage;
