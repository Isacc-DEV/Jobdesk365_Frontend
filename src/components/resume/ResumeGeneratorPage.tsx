import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Zap
} from "lucide-react";
import { useProfiles } from "../../hooks/useProfiles";
import { API_BASE, AI_SERVICE_URL, TOKEN_KEY } from "../../config";

const shuffleArray = <T,>(items: T[]) => {
  if (!Array.isArray(items) || items.length < 2) return items;
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getValueByPath = (source: any, path: string) => {
  if (!source || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), source);
};

const hydrateTemplate = (template: string, data: any) => {
  if (!template) return "";
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_match, token) => {
    const value = getValueByPath(data, token.trim());
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }
    return String(value);
  });
};

const injectScript = (html: string, scriptTag: string) => {
  if (!html) return scriptTag;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${scriptTag}</head>`);
  }
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (bodyMatch) {
    return html.replace(bodyMatch[0], `${bodyMatch[0]}${scriptTag}`);
  }
  return `${scriptTag}${html}`;
};

const normalizeBaseResumeForTemplate = (rawResume: any) => {
  const resume = rawResume || {};
  const profileBlock = resume.Profile || resume.profile || {};
  const contactBlock = profileBlock.contact || resume.contact || {};
  const summaryValue = resume.summary?.text || resume.summary?.summary || resume.summary || "";
  const summaryText = Array.isArray(summaryValue)
    ? summaryValue.filter(Boolean).join("\n")
    : String(summaryValue || "");
  const skillsValue = resume.skills?.raw || resume.skills?.skills || resume.skills || resume.skill || [];
  const skills = Array.isArray(skillsValue)
    ? skillsValue.filter(Boolean)
    : typeof skillsValue === "string"
    ? skillsValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const experienceSource =
    resume.workExperience || resume.work_experience || resume.workExperience || resume.experience || [];
  const experienceItems = Array.isArray(experienceSource) ? experienceSource : [];
  const workExperience = experienceItems.map((exp: any) => {
    const bullets = normalizeBullets(exp?.bullets ?? exp?.bullet_points ?? exp?.bulletPoints ?? exp?.bullet ?? "");
    const endDateValue = exp?.end_date || exp?.endDate || "";
    const isPresent = exp?.isPresent || String(endDateValue).toLowerCase() === "present";
    return {
      companyTitle: exp?.companyTitle || exp?.company_name || exp?.companyName || "",
      roleTitle: exp?.roleTitle || exp?.role_title || "",
      employmentType: exp?.employmentType || exp?.employment_type || "",
      location: exp?.location || exp?.location_text || exp?.locationText || "",
      startDate: exp?.startDate || exp?.start_date || "",
      endDate: isPresent ? "Present" : endDateValue || "",
      bullets: bullets.length ? bullets : []
    };
  });

  return {
    Profile: {
      name: profileBlock.name || resume.name || resume.full_name || resume.fullName || "",
      headline: profileBlock.headline || resume.headline || "",
      contact: {
        location: contactBlock.location || resume.location || resume.location_text || resume.locationText || "",
        email: contactBlock.email || resume.email || "",
        phone: contactBlock.phone || resume.phone || resume.phone_number || resume.phoneNumber || "",
        linkedin: contactBlock.linkedin || resume.linkedin || resume.linkedin_url || resume.linkedinUrl || ""
      }
    },
    summary: { text: summaryText },
    workExperience,
    skills: { raw: skills.length ? skills : [] }
  };
};

const buildTailoredResumePayload = (rawResume: any, aiData: any) => {
  const base = normalizeBaseResumeForTemplate(rawResume);
  if (!aiData) return base;

  if (aiData.headline_new) {
    base.Profile = { ...base.Profile, headline: aiData.headline_new };
  }
  if (Array.isArray(aiData.summary_new) && aiData.summary_new.length) {
    base.summary = { text: aiData.summary_new.filter(Boolean).join("\n") };
  }
  const skillsToAdd = Array.isArray(aiData.skills_to_add)
    ? aiData.skills_to_add.map((item: any) => item?.skill).filter(Boolean)
    : [];
  base.skills = { raw: mergeSkills(base.skills?.raw || [], skillsToAdd) };

  const bulletGroups = Array.isArray(aiData.experience_bullets_to_add)
    ? aiData.experience_bullets_to_add
    : [];
  bulletGroups.forEach((group: any) => {
    const index = Number(group?.company_index);
    if (!Number.isFinite(index)) return;
    if (!base.workExperience?.[index]) return;
    const bullets = Array.isArray(group?.bullets) ? group.bullets : [];
    bullets.forEach((bullet: any) => {
      if (bullet?.text) {
        base.workExperience[index].bullets.push(bullet.text);
      }
    });
  });

  return base;
};

const buildPreviewDocument = (templateHtml: string, aiData: any, title: string) => {
  const safeJson = escapeHtml(JSON.stringify(aiData || {}, null, 2));
  const encodedTemplate = JSON.stringify(templateHtml || "");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title || "Resume Preview")}</title>
    <style>
      body { font-family: "Inter", system-ui, sans-serif; margin: 0; background: #f5f7fb; }
      .toolbar { padding: 16px 24px; background: #fff; border-bottom: 1px solid #e5e7eb; }
      .layout { display: grid; grid-template-columns: 1fr 360px; gap: 16px; padding: 20px; }
      .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
      .template { padding: 16px; min-height: 70vh; }
      .json { padding: 16px; font-size: 12px; white-space: pre-wrap; }
      iframe { width: 100%; min-height: 70vh; border: 0; }
      @media print { .toolbar, .json-panel { display: none; } .layout { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="toolbar"><strong>Resume Preview</strong></div>
    <div class="layout">
      <div class="panel template">
        <iframe id="templateFrame" title="Resume Template"></iframe>
      </div>
      <div class="panel json-panel">
        <div class="json">${safeJson}</div>
      </div>
    </div>
    <script>
      const frame = document.getElementById("templateFrame");
      frame.srcdoc = ${encodedTemplate};
    </script>
  </body>
</html>`;
};

const buildPrintDocument = (templateHtml: string, title: string) => {
  const hasHtmlTag = /<html[\s>]/i.test(templateHtml);
  if (hasHtmlTag) return templateHtml;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title || "Resume")}</title>
    <style>
      body { font-family: "Inter", system-ui, sans-serif; margin: 0; }
    </style>
  </head>
  <body>
    ${templateHtml}
  </body>
</html>`;
};

const parseResumeRaw = (raw: any) => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
};
const hasBaseResume = (profile: any) => {
  const raw = profile?.raw || {};
  const resume = raw.base_resume ?? raw.baseResume;
  if (!resume) return false;
  if (typeof resume === "string") return resume.trim().length > 0;
  if (typeof resume === "object") return Object.keys(resume).length > 0;
  return false;
};

const normalizeBullets = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeExperience = (exp: any) => {
  const endDateValue = exp?.end_date || exp?.endDate || "";
  const isPresent = exp?.isPresent || String(endDateValue).toLowerCase() === "present";
  const startDate = exp?.startDate || exp?.start_date || "";
  const endDate = isPresent ? "Present" : endDateValue;
  const dates = [startDate, endDate].filter(Boolean).join(" - ");
  const bullets = normalizeBullets(exp?.bullets ?? exp?.bullet_points ?? exp?.bulletPoints ?? exp?.bullet ?? "").map(
    (text) => ({ text, needsInput: false, isAdded: false })
  );

  return {
    company: exp?.companyTitle || exp?.company_name || exp?.companyName || "",
    role: exp?.roleTitle || exp?.role_title || "",
    dates,
    bullets: shuffleArray(bullets)
  };
};

const buildBaseResumeView = (profile: any) => {
  const raw = profile?.raw || {};
  const resume = raw.base_resume ?? raw.baseResume ?? {};
  const profileBlock = resume.Profile || resume.profile || {};
  const summaryValue = resume.summary?.text || resume.summary?.summary || resume.summary || "";
  const summaryLines = Array.isArray(summaryValue)
    ? summaryValue.filter(Boolean)
    : typeof summaryValue === "string"
    ? summaryValue
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const skillsValue = resume.skills?.raw || resume.skills?.skills || resume.skills || resume.skill || [];
  const skills = Array.isArray(skillsValue)
    ? skillsValue.filter(Boolean)
    : typeof skillsValue === "string"
    ? skillsValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const experienceSource =
    resume.workExperience || resume.work_experience || resume.workExperience || resume.experience || [];
  const experienceItems = Array.isArray(experienceSource) ? experienceSource : [];

  return {
    name:
      profileBlock.name ||
      resume.name ||
      resume.full_name ||
      resume.fullName ||
      profile?.name ||
      "",
    headline: profileBlock.headline || resume.headline || profile?.subtitle || "",
    summaryLines,
    skills,
    experience: experienceItems.map(normalizeExperience)
  };
};

const mergeSkills = (baseSkills: string[], addedSkills: string[]) => {
  const seen = new Set<string>();
  const merged: string[] = [];
  const pushSkill = (skill: string) => {
    const key = skill.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(skill);
  };
  baseSkills.forEach((skill) => {
    if (skill) pushSkill(skill);
  });
  addedSkills.forEach((skill) => {
    if (skill) pushSkill(skill);
  });
  return merged;
};

const applyBulletsToAdd = (baseView: any, bulletsToAdd: any) => {
  if (!baseView) return null;
  const updates = Array.isArray(bulletsToAdd) ? bulletsToAdd : [];
  const nextExperience = (baseView.experience || []).map((item: any) => ({
    ...item,
    bullets: Array.isArray(item.bullets)
      ? item.bullets.map((bullet: any) => ({ ...bullet, isAdded: Boolean(bullet.isAdded) }))
      : []
  }));

  updates.forEach((group) => {
    const index = Number(group?.company_index);
    if (!Number.isFinite(index)) return;
    if (index < 0 || index >= nextExperience.length) return;
    const bullets = Array.isArray(group?.bullets) ? group.bullets : [];
    bullets.forEach((bullet: any) => {
      if (!bullet?.text) return;
      nextExperience[index].bullets.push({
        text: bullet.text,
        needsInput: Boolean(bullet.needs_input),
        isAdded: true
      });
    });
  });

  nextExperience.forEach((item) => {
    if (Array.isArray(item?.bullets)) {
      item.bullets = shuffleArray(item.bullets);
    }
  });

  return { ...baseView, experience: nextExperience };
};

const buildTailoredResumeView = (aiData: any, baseView: any) => {
  if (!aiData || !baseView) return null;
  const summaryLines = Array.isArray(aiData?.summary_new)
    ? aiData.summary_new.filter(Boolean)
    : baseView.summaryLines;
  const skillsToAdd = Array.isArray(aiData?.skills_to_add)
    ? aiData.skills_to_add.map((item: any) => item?.skill).filter(Boolean)
    : [];
  const mergedSkills = mergeSkills(baseView.skills || [], skillsToAdd);
  const addedSkills = new Set(skillsToAdd.map((skill: string) => skill.toLowerCase()));
  const experienceWithAdds = applyBulletsToAdd(baseView, aiData?.experience_bullets_to_add);

  return {
    name: baseView.name || "",
    headline: aiData?.headline_new || baseView.headline || "",
    summaryLines,
    skills: mergedSkills,
    experience: experienceWithAdds?.experience || baseView.experience,
    addedSkills
  };
};

const normalizeAiResponse = (payload: any) => {
  if (!payload) return null;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload;
};

const ResumeGeneratorPage = () => {
  const { profiles, loading, error } = useProfiles();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobSource, setJobSource] = useState("manual");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [highlightResult, setHighlightResult] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const selectedProfile = useMemo(
    () => profiles.find((profile: any) => profile.id === selectedId) || null,
    [profiles, selectedId]
  );

  const baseResumeView = useMemo(
    () => (selectedProfile ? buildBaseResumeView(selectedProfile) : null),
    [selectedProfile]
  );

  const tailoredResumeView = useMemo(
    () => (aiResult && baseResumeView ? buildTailoredResumeView(aiResult, baseResumeView) : null),
    [aiResult, baseResumeView]
  );

  const scoreValue = useMemo(() => {
    if (typeof aiResult?.match_score === "number") {
      return aiResult.match_score;
    }
    if (!aiResult) return null;
    const wordCount = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0;
    return Math.min(92, 70 + Math.min(20, Math.floor(wordCount / 10)));
  }, [aiResult, jobDescription]);

  const filteredProfiles = useMemo(() => {
    if (!query) return profiles;
    const term = query.toLowerCase();
    return profiles.filter(
      (profile: any) =>
        profile.name?.toLowerCase().includes(term) ||
        profile.subtitle?.toLowerCase().includes(term) ||
        profile.templateTitle?.toLowerCase().includes(term)
    );
  }, [profiles, query]);

  const selectedHasBaseResume = selectedProfile ? hasBaseResume(selectedProfile) : false;
  const selectedHasTemplate = Boolean(
    selectedProfile?.templateId || selectedProfile?.raw?.resume_template_id
  );
  const canPreview = Boolean(aiResult && selectedProfile && selectedHasTemplate);

  const handleSelectProfile = (profile: any) => {
    const locked = Boolean(profile?.raw?.locked || profile?.raw?.permission === "locked");
    if (locked) return;
    setSelectedId(profile.id);
    setAiResult(null);
    setCompareMode(false);
    setGenerationError("");
  };

  const handleGenerate = async () => {
    if (!selectedProfile || !selectedHasTemplate || !jobDescription.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerationError("");
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
      const res = await fetch(AI_SERVICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          job_description: jobDescription.trim(),
          profile_id: selectedProfile?.id
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to generate resume (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";
      const rawPayload = contentType.includes("application/json") ? await res.json() : await res.text();
      const aiData = normalizeAiResponse(rawPayload);
      if (!aiData) {
        throw new Error("AI response was empty.");
      }
      setAiResult(aiData);
      setCompareMode(false);
      setHighlightResult(true);
      window.setTimeout(() => setHighlightResult(false), 1200);
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      setGenerationError(err?.message || "We couldn't generate this resume. Try adjusting the job description.");
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchTemplateCode = async (templateId: string) => {
    if (!API_BASE) {
      throw new Error("API base URL not configured.");
    }
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    const res = await fetch(`${API_BASE}/templates/${templateId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to load template (${res.status})`);
    }
    return res.json();
  };

  const openPreview = async (autoPrint: boolean) => {
    if (!selectedProfile || !aiResult) return;
    const templateId = selectedProfile?.templateId || selectedProfile?.raw?.resume_template_id;
    if (!templateId) {
      setGenerationError("Select a resume template to preview.");
      return;
    }
    if (previewLoading) return;
    setPreviewLoading(true);
    try {
      const template = await fetchTemplateCode(String(templateId));
      if (!template?.code) {
        throw new Error("Template code not found.");
      }
      const baseResumeRaw = parseResumeRaw(
        selectedProfile?.raw?.base_resume ?? selectedProfile?.raw?.baseResume ?? {}
      );
      const tailoredPayload = buildTailoredResumePayload(baseResumeRaw, aiResult);
      const dataBundle = { resume: tailoredPayload, tailored: aiResult };
      const hydratedTemplate = hydrateTemplate(String(template.code), dataBundle);
      const dataScript = `<script>window.__RESUME__ = ${JSON.stringify(
        tailoredPayload
      )}; window.__TAILORED__ = ${JSON.stringify(aiResult)};</script>`;
      const templateWithData = injectScript(hydratedTemplate, dataScript);

      const previewWindow = window.open("", "_blank");
      if (!previewWindow) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }

      if (autoPrint) {
        const doc = buildPrintDocument(templateWithData, template.title || "Resume");
        previewWindow.document.open();
        previewWindow.document.write(doc);
        previewWindow.document.close();
        previewWindow.focus();
        previewWindow.onload = () => {
          previewWindow.print();
        };
        return;
      }

      const doc = buildPreviewDocument(templateWithData, aiResult, template.title || "Resume Preview");
      previewWindow.document.open();
      previewWindow.document.write(doc);
      previewWindow.document.close();
    } catch (err: any) {
      setGenerationError(err?.message || "Unable to open preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const navigateToProfiles = () => {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", "/profiles");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const renderResumeView = (view: any, options?: { highlightAdded?: boolean; addedSkills?: Set<string> }) => {
    if (!view) return null;
    const highlightAdded = options?.highlightAdded ?? false;
    const addedSkills = options?.addedSkills ?? new Set<string>();

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-ink">{view.name || "Resume"}</h3>
          <p className="text-sm text-ink-muted">{view.headline || "Headline not provided."}</p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-ink-muted">Summary</h4>
          <div className="mt-2 space-y-2 text-sm text-ink">
            {view.summaryLines?.length ? (
              view.summaryLines.map((line: string, index: number) => (
                <p key={`${view.name}-summary-${index}`} className="leading-relaxed">
                  {line}
                </p>
              ))
            ) : (
              <p className="text-ink-muted">No summary available.</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-ink-muted">Skills</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {view.skills?.length ? (
              view.skills.map((skill: string) => {
                const isAdded = highlightAdded && addedSkills.has(skill.toLowerCase());
                return (
                  <span
                    key={`${view.name}-skill-${skill}`}
                    className={`px-2 py-1 rounded-full border text-xs font-medium ${
                      isAdded
                        ? "bg-accent-primary/10 text-accent-primary border-accent-primary/30"
                        : "bg-white border-border text-ink"
                    }`}
                  >
                    {skill}
                  </span>
                );
              })
            ) : (
              <p className="text-sm text-ink-muted">No skills listed.</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-ink-muted">Experience</h4>
          <div className="mt-3 space-y-4">
            {view.experience?.length ? (
              view.experience.map((item: any, index: number) => (
                <div key={`${view.name}-exp-${index}`} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.company || "Company"}</p>
                      {item.role ? <p className="text-xs text-ink-muted">{item.role}</p> : null}
                    </div>
                    {item.dates ? <span className="text-xs text-ink-muted">{item.dates}</span> : null}
                  </div>
                  {item.bullets?.length ? (
                    <ul className="list-disc pl-5 space-y-2 text-sm text-ink">
                      {item.bullets.map((bullet: any, bulletIndex: number) => (
                        <li key={`${view.name}-exp-${index}-${bulletIndex}`} className="leading-relaxed">
                          {highlightAdded && bullet.isAdded ? (
                            <span className="inline rounded bg-amber-50 border border-amber-100 px-1.5 py-0.5">
                              {bullet.text}
                            </span>
                          ) : (
                            bullet.text
                          )}
                          {bullet.needsInput ? (
                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Needs input
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-muted">No bullets provided.</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-muted">No experience data.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="bg-[#F5F7FB] min-h-[calc(100vh-64px)] border-t border-border px-4 py-6">
      <div className="mx-auto">
        <div className="hidden lg:grid grid-cols-[260px_420px_minmax(0,1fr)] gap-5">
          <section className="bg-white border border-border h-[calc(100vh-128px)] flex flex-col">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Profiles</p>
                  <h2 className="text-base font-semibold text-ink">Who am I applying as?</h2>
                </div>
                <Sparkles size={18} className="text-accent-primary" />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-page border border-border px-3 py-2">
                <Search size={16} className="text-ink-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search profiles..."
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {loading ? (
                <div className="space-y-3 pt-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-20 rounded-lg bg-page border border-border animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="mt-4 text-sm text-red-500">{error}</div>
              ) : filteredProfiles.length === 0 ? (
                <div className="mt-4 text-sm text-ink-muted">No profiles found.</div>
              ) : (
                <div className="space-y-3 pt-3">
                  {filteredProfiles.map((profile: any) => {
                    const ready = hasBaseResume(profile);
                    const locked = Boolean(profile?.raw?.locked || profile?.raw?.permission === "locked");
                    const isSelected = profile.id === selectedId;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        title="View profile"
                        onClick={() => handleSelectProfile(profile)}
                        className={`w-full text-left rounded-lg px-3 py-3 transition duration-150 ${
                          locked ? "opacity-60 cursor-not-allowed" : "hover:bg-[#EEF2F7]"
                        } ${isSelected ? "bg-search ring-1 ring-accent-primary/40" : "bg-search"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-ink">{profile.name}</p>
                              {isSelected ? (
                                <span className="text-xs font-semibold text-accent-primary">Selected</span>
                              ) : null}
                            </div>
                            <p className="text-xs text-ink-muted mt-0.5">{profile.subtitle}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              {locked ? (
                                <>
                                  <Lock size={14} className="text-ink-muted" />
                                  <span className="text-ink-muted">Locked</span>
                                </>
                              ) : ready ? (
                                <>
                                  <CheckCircle2 size={14} className="text-accent-success" />
                                  <span className="text-ink">Status: Ready</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle size={14} className="text-accent-warning" />
                                  <span className="text-ink">Missing base resume</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 pb-5 pt-2">
              <button
                type="button"
                onClick={navigateToProfiles}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-border py-2.5 text-sm font-semibold text-ink hover:bg-[#DDE3EA] transition"
              >
                <Plus size={16} />
                Create New Profile
              </button>
            </div>
          </section>
          <section className=" bg-white border border-border h-[calc(100vh-128px)] flex flex-col">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Job Description</p>
                  <h2 className="text-base font-semibold text-ink">What job are we applying for?</h2>
                </div>
                <FileText size={18} className="text-accent-primary" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {!selectedProfile ? (
                <div className="rounded-lg bg-page border border-border px-4 py-3 text-sm text-ink-muted mb-4">
                  Select a profile to begin generating resumes.
                </div>
              ) : null}
              {selectedProfile && !selectedHasBaseResume ? (
                <div className="rounded-xl bg-amber-50 text-amber-700 text-sm px-4 py-3 mb-4">
                  This profile is missing a base resume. Results may be limited.
                </div>
              ) : null}
              {selectedProfile && !selectedHasTemplate ? (
                <div className="rounded-xl bg-slate-100 text-slate-700 text-sm px-4 py-3 mb-4">
                  Select a resume template for this profile to generate a tailored resume.
                </div>
              ) : null}

              <div
                className={`${
                  selectedProfile && selectedHasTemplate ? "" : "pointer-events-none opacity-60"
                }`}
              >
                <div className="mb-5">
                  <label className="text-sm font-semibold text-ink">Job Source (Optional)</label>
                  <div className="mt-2 grid grid-cols-[140px_1fr] gap-3">
                    <select
                      value={jobSource}
                      onChange={(event) => setJobSource(event.target.value)}
                      className="rounded-lg bg-page border border-border px-3 py-2 text-sm text-ink focus:outline-none"
                    >
                      <option value="manual">Manual Paste</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="indeed">Indeed</option>
                      <option value="url">URL</option>
                    </select>
                    {jobSource === "url" ? (
                      <input
                        value={jobUrl}
                        onChange={(event) => setJobUrl(event.target.value)}
                        placeholder="Paste the job posting URL"
                        className="rounded-lg bg-page border border-border px-3 py-2 text-sm text-ink focus:outline-none"
                      />
                    ) : (
                      <div className="rounded-lg bg-page border border-border px-3 py-2 text-sm text-ink-muted flex items-center">
                        Optional link will appear here.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-sm font-semibold text-ink">Job Description</label>
                  <textarea
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    className="mt-2 w-full min-h-[240px] rounded-lg bg-page border border-border px-4 py-3 text-sm text-ink focus:outline-none"
                    placeholder="Paste the full job description here. Responsibilities, requirements, tech stack..."
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
                    <span>{jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0} words</span>
                    {jobDescription ? (
                      <span className="text-ink-muted">Ready to generate</span>
                    ) : (
                      <span className="text-ink-muted">Paste a job description to continue</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!selectedProfile || !selectedHasTemplate || !jobDescription.trim() || isGenerating}
                  className={`mt-5 w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition ${
                    !selectedProfile || !selectedHasTemplate || !jobDescription.trim() || isGenerating
                      ? "bg-border text-ink-muted cursor-not-allowed"
                      : "bg-accent-primary text-white hover:shadow-soft"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Generate Resume
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
          <section className=" bg-white border border-border h-[calc(100vh-128px)] flex flex-col">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Generated Resume</p>
                  <h2 className="text-base font-semibold text-ink">Generated Resume</h2>
                  <p className="text-sm text-ink-muted mt-1">
                    Score: {scoreValue !== null ? `${Math.round(scoreValue)}% Match` : "--"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                  onClick={handleGenerate}
                    disabled={!selectedProfile || !selectedHasTemplate || !jobDescription.trim() || isGenerating}
                    className="px-3 py-2 rounded-lg bg-border text-xs font-semibold text-ink hover:bg-[#DDE3EA] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-1.5">
                      <RefreshCw size={14} />
                      Regenerate
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode((prev) => !prev)}
                    disabled={!tailoredResumeView || !baseResumeView}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      compareMode
                        ? "bg-accent-primary text-white"
                        : "bg-border text-ink hover:bg-[#DDE3EA]"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {compareMode ? "Hide Compare" : "Compare with Base"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-24">
              {isGenerating ? (
                <div className="mt-10 flex flex-col items-center gap-3 text-ink-muted">
                  <span className="h-8 w-8 border-2 border-accent-primary/60 border-t-accent-primary rounded-full animate-spin" />
                  Generating tailored resume...
                </div>
              ) : generationError ? (
                <div className="mt-6 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
                  {generationError}
                </div>
              ) : !selectedProfile ? (
                <div className="mt-6 rounded-lg bg-page border border-border px-4 py-3 text-sm text-ink-muted">
                  Select a profile to begin generating resumes.
                </div>
              ) : selectedProfile && !selectedHasTemplate ? (
                <div className="mt-6 rounded-lg bg-page border border-border px-4 py-3 text-sm text-ink-muted">
                  Select a resume template for this profile to view generated results.
                </div>
              ) : !jobDescription.trim() ? (
                <div className="mt-6 rounded-lg bg-page border border-border px-4 py-3 text-sm text-ink-muted">
                  Paste a job description to tailor your resume.
                </div>
              ) : !tailoredResumeView ? (
                <div className="mt-6 rounded-lg bg-page border border-border px-4 py-3 text-sm text-ink-muted">
                  Ready to generate. Click "Generate Resume" to see results.
                </div>
              ) : (
                <div
                  ref={resultRef}
                  className={`mt-6 mx-auto w-full rounded-lg bg-page border border-border p-6 transition ${
                    highlightResult ? "ring-2 ring-accent-primary/40" : ""
                  } ${compareMode ? "max-w-none" : "max-w-[640px]"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{selectedProfile?.name}</h3>
                      <p className="text-sm text-ink-muted">{selectedProfile?.subtitle}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-primary/10 text-accent-primary">
                      Tailored
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-lg bg-white border border-border px-4 py-3 text-sm text-ink">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Match insights</p>
                      <p className="mt-2 text-sm text-ink-muted">
                        Tailored summary and add-only bullets are aligned to the JD. Added bullets are highlighted in
                        green; items that need your input are flagged.
                      </p>
                    </div>

                    {compareMode ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Base Resume
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Tailored Resume
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-accent-primary/10 text-accent-primary px-2.5 py-1">
                            <span className="h-2 w-2 rounded-full bg-accent-primary" />
                            Added skill
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-2.5 py-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Needs input
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-600">Base Resume</p>
                            </div>
                            <div className="mt-4">{renderResumeView(baseResumeView)}</div>
                          </div>
                          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Tailored Resume</p>
                            </div>
                            <div className="mt-4">
                              {renderResumeView(tailoredResumeView, {
                                highlightAdded: true,
                                addedSkills: tailoredResumeView?.addedSkills
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-white border border-border p-4">
                        {renderResumeView(tailoredResumeView, {
                          highlightAdded: true,
                          addedSkills: tailoredResumeView?.addedSkills
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white/95 backdrop-blur px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openPreview(false)}
                  disabled={!canPreview || previewLoading}
                  className="flex-1 px-3 py-2 rounded-lg bg-border text-ink text-sm font-semibold hover:bg-[#DDE3EA] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {previewLoading ? "Opening..." : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => openPreview(true)}
                  disabled={!canPreview || previewLoading}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-semibold hover:shadow-soft disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  className="flex-1 px-3 py-2 rounded-lg bg-border text-ink text-sm font-semibold hover:bg-[#DDE3EA]"
                >
                  Export DOCX
                </button>
              </div>
            </div>
          </section>
        </div>
        <div className="lg:hidden rounded-xl bg-white border border-border px-6 py-10 text-center text-ink">
          <p className="text-lg font-semibold">Resume Generator is desktop-only.</p>
          <p className="text-sm text-ink-muted mt-2">
            Switch to a larger screen to build tailored resumes.
          </p>
        </div>
      </div>
    </main>
  );
};

export default ResumeGeneratorPage;
