import { normalizeResumeDateInput, normalizeResumeWorkExperienceDates } from "./resumeDate";

export type TemplateResume = {
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

type SafeHtml = { __html: string };

const isSafeHtml = (value: unknown): value is SafeHtml =>
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
  return String(value)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
};

const normalizeDateForTemplate = (value: unknown, allowPresent: boolean) => {
  const normalized = normalizeResumeDateInput(value, { allowPresent });
  if (normalized.isValid) return normalized.value;
  return cleanString(value);
};

const normalizeWorkExperienceItems = (items?: TemplateResume["workExperience"]) => {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => {
      const companyTitle = cleanString(item?.companyTitle);
      if (!companyTitle) return null;
      const roleTitle = cleanString(item?.roleTitle);
      const employmentType = cleanString(item?.employmentType);
      const location = cleanString(item?.location);
      const startDate = normalizeDateForTemplate(item?.startDate, false);
      const endDate = normalizeDateForTemplate(item?.endDate, true);
      const bullets = (item?.bullets ?? []).map(cleanString).filter(Boolean);
      return {
        companyTitle,
        roleTitle,
        employmentType,
        location,
        startDate,
        endDate,
        bullets
      };
    })
    .filter(Boolean) as TemplateResume["workExperience"];
};

const normalizeEducationItems = (items?: TemplateResume["education"]) => {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => {
      const institution = cleanString(item?.institution);
      const degree = cleanString(item?.degree);
      const field = cleanString(item?.field);
      const date = normalizeDateForTemplate(item?.date, false);
      const coursework = (item?.coursework ?? []).map(cleanString).filter(Boolean);
      if (!institution && !degree && !field && !date && coursework.length === 0) {
        return null;
      }
      return {
        institution,
        degree,
        field,
        date,
        coursework
      };
    })
    .filter(Boolean) as TemplateResume["education"];
};

export const sanitizeTemplateResume = (resume: TemplateResume): TemplateResume => {
  const profile = resume?.Profile ?? {};
  const contact = profile?.contact ?? {};
  const summaryRaw =
    typeof resume?.summary === "string"
      ? resume.summary
      : resume?.summary?.text ?? (resume as any)?.summary?.summary ?? "";
  const normalizedWorkExperience =
    normalizeWorkExperienceItems(
      (resume as any)?.workExperience ??
      (resume as any)?.work_experience ??
      (resume as any)?.experience ??
      []
    ) ?? [];
  const normalizedEducation = normalizeEducationItems(
    (resume as any)?.education ?? (resume as any)?.educationHistory ?? []
  );
  const skillsValue =
    (resume as any)?.skills?.raw ??
    (resume as any)?.skills?.skills ??
    (resume as any)?.skills ??
    (resume as any)?.skill ??
    [];
  const skillsRaw = Array.isArray(skillsValue)
    ? skillsValue.map(cleanString).filter(Boolean)
    : typeof skillsValue === "string"
    ? skillsValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  return {
    ...resume,
    Profile: {
      name: cleanString(profile?.name),
      headline: cleanString(profile?.headline),
      contact: {
        location: cleanString(contact?.location),
        email: cleanString(contact?.email),
        phone: cleanString(contact?.phone),
        linkedin: cleanString(contact?.linkedin)
      }
    },
    summary: { text: cleanString(summaryRaw) },
    workExperience: normalizedWorkExperience,
    education: normalizedEducation,
    skills: { raw: skillsRaw }
  };
};

const buildWorkExperienceHtml = (items?: TemplateResume["workExperience"]) => {
  const list = normalizeWorkExperienceItems(items);
  if (!list.length) return "";
  return list
    .map((item) => {
      const title = [item.roleTitle, item.companyTitle]
        .map(cleanString)
        .filter(Boolean)
        .join(" - ");
      const startDate = cleanString(item.startDate);
      const endDate = cleanString(item.endDate);
      const dates = [startDate, endDate].filter(Boolean).join(" - ");
      const meta = [item.location, item.employmentType]
        .map(cleanString)
        .filter(Boolean)
        .join(" | ");
      const bullets = (item.bullets ?? []).map(cleanString).filter(Boolean);
      const bulletHtml = bullets.length
        ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
        : "";
      if (!title) return "";
      const header = escapeHtml(title);
      const datesHtml = dates ? `<div class="resume-meta">${escapeHtml(dates)}</div>` : "";
      const metaHtml = meta ? `<div class="resume-meta">${escapeHtml(meta)}</div>` : "";
      return `<div class="resume-item"><div><strong>${header}</strong></div>${datesHtml}${metaHtml}${bulletHtml}</div>`;
    })
    .filter(Boolean)
    .join("");
};

const buildEducationHtml = (items?: TemplateResume["education"]) => {
  const list = normalizeEducationItems(items);
  if (!list.length) return "";
  return list
    .map((item) => {
      const title = [item.degree, item.field].map(cleanString).filter(Boolean).join(" - ");
      const header = [item.institution, title].map(cleanString).filter(Boolean).join(" | ");
      const date = normalizeDateForTemplate(item.date, false);
      const coursework = (item.coursework ?? []).map(cleanString).filter(Boolean);
      const courseworkText = coursework.length ? `Coursework: ${coursework.join(", ")}` : "";
      const dateHtml = date ? `<div class="resume-meta">${escapeHtml(date)}</div>` : "";
      const courseworkHtml = courseworkText
        ? `<div class="resume-meta">${escapeHtml(courseworkText)}</div>`
        : "";
      if (!header && !date && !courseworkText) return "";
      const headerHtml = header ? `<div><strong>${escapeHtml(header)}</strong></div>` : "";
      return `<div class="resume-item">${headerHtml}${dateHtml}${courseworkHtml}</div>`;
    })
    .filter(Boolean)
    .join("");
};

export const buildTemplateData = (resume: TemplateResume) => {
  const normalizedResume = (
    normalizeResumeWorkExperienceDates(resume) as TemplateResume
  ) ?? resume;
  const cleanedResume = sanitizeTemplateResume(normalizedResume);
  const profile = cleanedResume.Profile ?? {};
  const contact = profile.contact ?? {};
  const summary = cleanedResume.summary ?? {};
  const skills = cleanedResume.skills ?? {};
  const normalizedWorkExperience =
    cleanedResume.workExperience ??
    (cleanedResume as any).work_experience ??
    (cleanedResume as any).experience ??
    [];
  const normalizedEducation = cleanedResume.education ?? [];
  const summaryText = cleanString(summary.text);
  const skillsRaw = (skills.raw ?? []).map(cleanString).filter(Boolean);

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
    summary: { text: summaryText },
    skills: { raw: skillsRaw },
    workExperience: normalizedWorkExperience,
    work_experience: normalizedWorkExperience,
    education: normalizedEducation,
    hasWorkExperience: normalizedWorkExperience.length > 0,
    hasEducation: normalizedEducation.length > 0,
    hasSummary: summaryText.length > 0,
    hasSkills: skillsRaw.length > 0
  };
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
  let current: unknown = context;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
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
      return buildWorkExperienceHtml(value as TemplateResume["workExperience"]);
    }
    if (path == "education") {
      return buildEducationHtml(value as TemplateResume["education"]);
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

export const renderResumeTemplate = (templateHtml: string, resume: TemplateResume): string => {
  if (!templateHtml.trim()) return "";
  const data = buildTemplateData(resume);
  return renderMustacheTemplate(templateHtml, data);
};
