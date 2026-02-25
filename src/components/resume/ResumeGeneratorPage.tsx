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
import { useUser } from "../../hooks/useUser";
import { renderResumeTemplate } from "../../lib/resumeTemplateRenderer";
import {
  formatResumeDateRange,
  normalizeResumeExperienceDates,
  normalizeResumeWorkExperienceDates
} from "../../lib/resumeDate";
import {
  getProfilesEndpointPathByRoles,
  getProfilesRouteByRoles
} from "../../lib/profilesAccess";

type TailorBulletType = "new" | "updated";

type TailorBulletUpdate = {
  text: string;
  type: TailorBulletType;
  original_index?: number;
  needs_input?: boolean;
};

type TailorBulletGroup = {
  company_index: number;
  bullets: TailorBulletUpdate[];
};

type TailorUpdates = {
  headline: string;
  summary: string;
  bullets: TailorBulletGroup[];
};

type TailorResponse = {
  updates: TailorUpdates;
  resume?: any;
  match_score?: number;
};

type ResumeViewBullet = {
  text: string;
  needsInput: boolean;
  changeType: "none" | "new" | "updated";
};

type ResumeViewExperience = {
  company: string;
  role: string;
  dates: string;
  bullets: ResumeViewBullet[];
};

type ResumeView = {
  name: string;
  headline: string;
  summaryLines: string[];
  skills: string[];
  experience: ResumeViewExperience[];
  addedSkills: Set<string>;
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
  const resume = normalizeResumeWorkExperienceDates(rawResume || {}) || {};
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
  const normalizedExperience = normalizeResumeExperienceDates(experienceItems);
  const workExperience = normalizedExperience.items.map((exp: any) => {
    const bullets = normalizeBullets(exp?.bullets ?? exp?.bullet_points ?? exp?.bulletPoints ?? exp?.bullet ?? "");
    return {
      companyTitle: exp?.companyTitle || exp?.company_name || exp?.companyName || "",
      roleTitle: exp?.roleTitle || exp?.role_title || "",
      employmentType: exp?.employmentType || exp?.employment_type || "",
      location: exp?.location || exp?.location_text || exp?.locationText || "",
      startDate: exp?.startDate || exp?.start_date || "",
      endDate: exp?.isPresent ? "Present" : exp?.endDate || exp?.end_date || "",
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

const splitSummaryLines = (summary: string) =>
  String(summary || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const wrapHtmlIfNeeded = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.startsWith("<!doctype") && !trimmed.startsWith("<html")) {
    return `<!doctype html><html><body>${value}</body></html>`;
  }
  return value;
};

const serializeForScript = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const sanitizeFileName = (value: string) =>
  (value || "Resume")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const getPdfFilenameFromHeader = (header: string | null) => {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/^"|"$/g, "");
    } catch {
      return utf8Match[1].replace(/^"|"$/g, "");
    }
  }
  const basicMatch = header.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] ? basicMatch[1] : null;
};

const exportHtmlAsPdf = async (html: string, title: string) => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  const base = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
  const url = new URL("/templates/render-pdf", base).toString();
  const fileName = sanitizeFileName(title || "Resume");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ html, filename: fileName })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to export PDF (${res.status})`);
  }

  const blob = await res.blob();
  const headerName = getPdfFilenameFromHeader(res.headers.get("content-disposition"));
  const downloadName = headerName || `${fileName}.pdf`;
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

const buildTailoredResumePayload = (rawResume: any, tailoredView: ResumeView | null) => {
  const base = normalizeBaseResumeForTemplate(rawResume);
  if (!tailoredView) return base;

  if (tailoredView.headline) {
    base.Profile = { ...base.Profile, headline: tailoredView.headline };
  }
  base.summary = { text: (tailoredView.summaryLines || []).join("\n") };
  base.skills = { raw: Array.isArray(tailoredView.skills) ? tailoredView.skills : [] };
  if (Array.isArray(base.workExperience) && Array.isArray(tailoredView.experience)) {
    base.workExperience = base.workExperience.map((item: any, index: number) => {
      const tailoredExperience = tailoredView.experience[index];
      if (!tailoredExperience) return item;
      return {
        ...item,
        bullets: Array.isArray(tailoredExperience.bullets)
          ? tailoredExperience.bullets.map((bullet) => bullet.text)
          : []
      };
    });
  }

  return base;
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

const normalizeExperience = (exp: any): ResumeViewExperience => {
  const normalized = normalizeResumeExperienceDates([exp]);
  const first = (normalized.items?.[0] as any) || exp || {};
  const dates = formatResumeDateRange(first?.startDate || first?.start_date, first?.endDate || first?.end_date);
  const bullets = normalizeBullets(exp?.bullets ?? exp?.bullet_points ?? exp?.bulletPoints ?? exp?.bullet ?? "").map(
    (text) => ({ text, needsInput: false, changeType: "none" as const })
  );

  return {
    company: exp?.companyTitle || exp?.company_name || exp?.companyName || "",
    role: exp?.roleTitle || exp?.role_title || "",
    dates,
    bullets
  };
};

const buildBaseResumeView = (profile: any): ResumeView => {
  const raw = profile?.raw || {};
  const resume = normalizeResumeWorkExperienceDates(raw.base_resume ?? raw.baseResume ?? {}) ?? {};
  const profileBlock = resume.Profile || resume.profile || {};
  const summaryValue = resume.summary?.text || resume.summary?.summary || resume.summary || "";
  const summaryLines = Array.isArray(summaryValue)
    ? summaryValue.filter(Boolean).map((line: any) => String(line).trim()).filter(Boolean)
    : splitSummaryLines(summaryValue);
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
    experience: experienceItems.map(normalizeExperience),
    addedSkills: new Set<string>()
  };
};

const cloneExperience = (experience: ResumeViewExperience[]): ResumeViewExperience[] =>
  experience.map((item) => ({
    ...item,
    bullets: Array.isArray(item.bullets)
      ? item.bullets.map((bullet) => ({ ...bullet }))
      : []
  }));

const applyBulletUpdates = (baseView: ResumeView, updates: TailorUpdates) => {
  const nextExperience = cloneExperience(baseView.experience || []);
  const groups = Array.isArray(updates.bullets) ? updates.bullets : [];

  groups.forEach((group) => {
    const companyIndex = Number(group.company_index);
    if (!Number.isInteger(companyIndex)) return;
    if (companyIndex < 0 || companyIndex >= nextExperience.length) return;
    const companyBullets = nextExperience[companyIndex].bullets;
    if (!Array.isArray(companyBullets)) return;

    group.bullets
      .filter((bullet) => bullet.type === "updated")
      .forEach((bullet) => {
        if (!Number.isInteger(bullet.original_index)) return;
        const originalIndex = Number(bullet.original_index);
        if (originalIndex < 0 || originalIndex >= companyBullets.length) return;
        companyBullets[originalIndex] = {
          text: bullet.text,
          needsInput: Boolean(bullet.needs_input),
          changeType: "updated"
        };
      });

    group.bullets
      .filter((bullet) => bullet.type === "new")
      .forEach((bullet) => {
        const insertIndex = Math.floor(Math.random() * (companyBullets.length + 1));
        companyBullets.splice(insertIndex, 0, {
          text: bullet.text,
          needsInput: Boolean(bullet.needs_input),
          changeType: "new"
        });
      });
  });

  return nextExperience;
};

const buildTailoredResumeView = (updates: TailorUpdates, baseView: ResumeView) => {
  if (!updates || !baseView) return null;
  const summaryLines = splitSummaryLines(updates.summary);

  return {
    ...baseView,
    headline: updates.headline || baseView.headline || "",
    summaryLines: summaryLines.length ? summaryLines : baseView.summaryLines,
    experience: applyBulletUpdates(baseView, updates),
    addedSkills: new Set<string>()
  };
};

const normalizeAiResponse = (payload: any): { data: TailorResponse | null; error?: string } => {
  if (!payload) {
    return { data: null, error: "AI response was empty." };
  }

  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload);
    } catch {
      return { data: null, error: "AI response was not valid JSON." };
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { data: null, error: "Invalid AI response format." };
  }

  const updatesRaw = parsed?.updates;
  if (!updatesRaw || typeof updatesRaw !== "object" || Array.isArray(updatesRaw)) {
    return { data: null, error: "Invalid AI response: missing `updates` object." };
  }
  if (typeof updatesRaw.headline !== "string") {
    return { data: null, error: "Invalid AI response: `updates.headline` must be a string." };
  }
  if (typeof updatesRaw.summary !== "string") {
    return { data: null, error: "Invalid AI response: `updates.summary` must be a string." };
  }
  if (!Array.isArray(updatesRaw.bullets)) {
    return { data: null, error: "Invalid AI response: `updates.bullets` must be an array." };
  }

  const normalizedGroups: TailorBulletGroup[] = [];
  for (let groupIndex = 0; groupIndex < updatesRaw.bullets.length; groupIndex += 1) {
    const group = updatesRaw.bullets[groupIndex];
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      return { data: null, error: `Invalid AI response: updates.bullets[${groupIndex}] must be an object.` };
    }
    if (!Number.isInteger(group.company_index)) {
      return {
        data: null,
        error: `Invalid AI response: updates.bullets[${groupIndex}].company_index must be an integer.`
      };
    }
    if (!Array.isArray(group.bullets)) {
      return { data: null, error: `Invalid AI response: updates.bullets[${groupIndex}].bullets must be an array.` };
    }

    const normalizedBullets: TailorBulletUpdate[] = [];
    for (let bulletIndex = 0; bulletIndex < group.bullets.length; bulletIndex += 1) {
      const bullet = group.bullets[bulletIndex];
      if (!bullet || typeof bullet !== "object" || Array.isArray(bullet)) {
        return {
          data: null,
          error: `Invalid AI response: bullet at updates.bullets[${groupIndex}].bullets[${bulletIndex}] is invalid.`
        };
      }
      const text = typeof bullet.text === "string" ? bullet.text.trim() : "";
      if (!text) {
        return {
          data: null,
          error: `Invalid AI response: updates.bullets[${groupIndex}].bullets[${bulletIndex}].text is required.`
        };
      }
      if (bullet.type !== "new" && bullet.type !== "updated") {
        return {
          data: null,
          error: `Invalid AI response: updates.bullets[${groupIndex}].bullets[${bulletIndex}].type must be "new" or "updated".`
        };
      }
      if (bullet.type === "updated" && !Number.isInteger(bullet.original_index)) {
        return {
          data: null,
          error: `Invalid AI response: updates.bullets[${groupIndex}].bullets[${bulletIndex}].original_index must be an integer for updated bullets.`
        };
      }

      normalizedBullets.push({
        text,
        type: bullet.type,
        original_index: bullet.type === "updated" ? Number(bullet.original_index) : undefined,
        needs_input: Boolean(bullet.needs_input)
      });
    }

    normalizedGroups.push({
      company_index: Number(group.company_index),
      bullets: normalizedBullets
    });
  }

  return {
    data: {
      updates: {
        headline: updatesRaw.headline.trim(),
        summary: updatesRaw.summary,
        bullets: normalizedGroups
      },
      resume: parsed?.resume,
      match_score: typeof parsed?.match_score === "number" ? parsed.match_score : undefined
    }
  };
};

const ResumeGeneratorPage = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const endpointPath = getProfilesEndpointPathByRoles(roles);
  const profilesRoute = getProfilesRouteByRoles(roles);
  const { profiles, loading, error } = useProfiles({ endpointPath });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobSource, setJobSource] = useState("manual");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [aiResult, setAiResult] = useState<TailorResponse | null>(null);
  const [tailoredResumeView, setTailoredResumeView] = useState<ResumeView | null>(null);
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
  const canPreview = Boolean(tailoredResumeView && aiResult && selectedProfile && selectedHasTemplate);

  const handleSelectProfile = (profile: any) => {
    const locked = Boolean(profile?.raw?.locked || profile?.raw?.permission === "locked");
    if (locked) return;
    setSelectedId(profile.id);
    setAiResult(null);
    setTailoredResumeView(null);
    setGenerationError("");
  };

  const handleGenerate = async ({ regenerate = false } = {}) => {
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
          profile_id: selectedProfile?.id,
          regenerate
        })
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();
        let message = text;
        if (contentType.includes("application/json")) {
          try {
            const parsed = JSON.parse(text || "{}");
            message = parsed?.message || parsed?.error || text;
          } catch {
            message = text;
          }
        }
        throw new Error(message || `Failed to generate resume (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";
      const rawPayload = contentType.includes("application/json") ? await res.json() : await res.text();
      const normalized = normalizeAiResponse(rawPayload);
      if (!normalized.data) {
        throw new Error(normalized.error || "Invalid AI response format.");
      }
      if (!baseResumeView) {
        throw new Error("Base resume is not available for this profile.");
      }
      const nextTailoredView = buildTailoredResumeView(normalized.data.updates, baseResumeView);
      if (!nextTailoredView) {
        throw new Error("Unable to build tailored resume from updates.");
      }
      setAiResult(normalized.data);
      setTailoredResumeView(nextTailoredView);
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
    if (!selectedProfile || !aiResult || !tailoredResumeView) return;
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
      const tailoredPayload = buildTailoredResumePayload(baseResumeRaw, tailoredResumeView);
      const renderedTemplate = renderResumeTemplate(String(template.code), tailoredPayload);
      const safeResume = serializeForScript(tailoredPayload);
      const safeTailored = serializeForScript(aiResult);
      const dataScript = `<script>window.__RESUME__ = ${safeResume}; window.__TAILORED__ = ${safeTailored};</script>`;
      const baseTemplate = wrapHtmlIfNeeded(renderedTemplate || String(template.code));
      const templateWithData = injectScript(baseTemplate, dataScript);

      if (autoPrint) {
        await exportHtmlAsPdf(templateWithData, template.title || selectedProfile?.name || "Resume");
        return;
      }

      const previewWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!previewWindow) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }
      previewWindow.document.open();
      previewWindow.document.write(templateWithData);
      previewWindow.document.close();
    } catch (err: any) {
      setGenerationError(err?.message || "Unable to open preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const navigateToProfiles = () => {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", profilesRoute);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const renderResumeView = (
    view: ResumeView | null,
    options?: { highlightAdded?: boolean; addedSkills?: Set<string> }
  ) => {
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
                          {highlightAdded && bullet.changeType === "new" ? (
                            <span className="inline rounded bg-amber-50 border border-amber-100 px-1.5 py-0.5">
                              {bullet.text}
                            </span>
                          ) : highlightAdded && bullet.changeType === "updated" ? (
                            <span className="inline rounded bg-rose-50 border border-rose-100 px-1.5 py-0.5">
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
                  onClick={() => handleGenerate({ regenerate: true })}
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
                  onClick={() => handleGenerate({ regenerate: false })}
                    disabled={!selectedProfile || !selectedHasTemplate || !jobDescription.trim() || isGenerating}
                    className="px-3 py-2 rounded-lg bg-border text-xs font-semibold text-ink hover:bg-[#DDE3EA] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-1.5">
                      <RefreshCw size={14} />
                      Regenerate
                    </div>
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
                  } max-w-[640px]`}
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
                        Tailored headline and summary are aligned to the JD. Updated bullets are highlighted in pink,
                        newly added bullets in yellow, and items needing your input are flagged.
                      </p>
                    </div>
                    <div className="rounded-lg bg-white border border-border p-4">
                      {renderResumeView(tailoredResumeView, {
                        highlightAdded: true,
                        addedSkills: tailoredResumeView?.addedSkills
                      })}
                    </div>
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
