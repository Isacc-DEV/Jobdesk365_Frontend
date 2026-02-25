export type ResumeDateField = "startDate" | "endDate";

export type ResumeDateIssue = {
  index: number;
  field: ResumeDateField;
  value: string;
  message: string;
};

type NormalizeResumeDateOptions = {
  allowPresent?: boolean;
};

type NormalizeResumeDateResult = {
  value: string;
  isValid: boolean;
  isEmpty: boolean;
  error: string | null;
};

const PRESENT_LABEL = "Present";

const toTrimmedString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeMonthYear = (monthRaw: string, yearRaw: string): string | null => {
  const month = Number(monthRaw);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!/^(\d{2}|\d{4})$/.test(yearRaw)) return null;
  const year2 = yearRaw.slice(-2);
  return `${String(month).padStart(2, "0")}/${year2}`;
};

const normalizeDateUsingPatterns = (value: string): string | null => {
  const mmYY = value.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmYY) return normalizeMonthYear(mmYY[1], mmYY[2]);

  const mmYYYY = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYYYY) return normalizeMonthYear(mmYYYY[1], mmYYYY[2]);

  const yyyyMM = value.match(/^(\d{4})-(\d{1,2})$/);
  if (yyyyMM) return normalizeMonthYear(yyyyMM[2], yyyyMM[1]);

  const yyyyMMDD = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  if (yyyyMMDD) return normalizeMonthYear(yyyyMMDD[2], yyyyMMDD[1]);

  const mmDDYY = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mmDDYY) return normalizeMonthYear(mmDDYY[1], mmDDYY[3]);

  const mmDDYYYY = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmDDYYYY) return normalizeMonthYear(mmDDYYYY[1], mmDDYYYY[3]);

  return null;
};

export const normalizeResumeDateInput = (
  rawValue: unknown,
  options: NormalizeResumeDateOptions = {}
): NormalizeResumeDateResult => {
  const allowPresent = Boolean(options.allowPresent);
  const value = toTrimmedString(rawValue);

  if (!value) {
    return { value: "", isValid: true, isEmpty: true, error: null };
  }

  if (allowPresent && value.toLowerCase() === PRESENT_LABEL.toLowerCase()) {
    return { value: PRESENT_LABEL, isValid: true, isEmpty: false, error: null };
  }

  const normalized = normalizeDateUsingPatterns(value);
  if (normalized) {
    return { value: normalized, isValid: true, isEmpty: false, error: null };
  }

  return {
    value,
    isValid: false,
    isEmpty: false,
    error: `Invalid date "${value}". Expected MM/YY${allowPresent ? " or Present" : ""}.`
  };
};

export const formatResumeDateRange = (startDate: unknown, endDate: unknown): string => {
  const normalizedStart = normalizeResumeDateInput(startDate, { allowPresent: false });
  const normalizedEnd = normalizeResumeDateInput(endDate, { allowPresent: true });
  const startLabel = normalizedStart.isValid ? normalizedStart.value : toTrimmedString(startDate);
  const endLabel = normalizedEnd.isValid ? normalizedEnd.value : toTrimmedString(endDate);
  return [startLabel, endLabel].filter(Boolean).join(" - ");
};

export const normalizeResumeExperienceDates = (
  items: any
): { items: any[]; issues: ResumeDateIssue[] } => {
  if (!Array.isArray(items)) return { items: [], issues: [] };

  const issues: ResumeDateIssue[] = [];
  const normalized = items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const entry = item as Record<string, unknown>;
    const nextEntry: Record<string, unknown> = { ...entry };
    const startRaw = toTrimmedString(entry.startDate ?? entry.start_date);
    const endRaw = toTrimmedString(entry.endDate ?? entry.end_date);
    const isPresent = Boolean(
      entry.isPresent ??
      entry.isCurrent ??
      (endRaw && endRaw.toLowerCase() === PRESENT_LABEL.toLowerCase())
    );

    const normalizedStart = normalizeResumeDateInput(startRaw, { allowPresent: false });
    if (!normalizedStart.isValid) {
      issues.push({
        index,
        field: "startDate",
        value: normalizedStart.value,
        message: normalizedStart.error || "Invalid start date."
      });
    }
    const normalizedEnd = normalizeResumeDateInput(isPresent ? PRESENT_LABEL : endRaw, { allowPresent: true });
    if (!normalizedEnd.isValid) {
      issues.push({
        index,
        field: "endDate",
        value: normalizedEnd.value,
        message: normalizedEnd.error || "Invalid end date."
      });
    }

    nextEntry.startDate = normalizedStart.isValid ? normalizedStart.value : startRaw;
    nextEntry.endDate = normalizedEnd.isValid ? normalizedEnd.value : (isPresent ? PRESENT_LABEL : endRaw);
    nextEntry.isPresent = nextEntry.endDate === PRESENT_LABEL;

    if ("start_date" in entry) {
      nextEntry.start_date = nextEntry.startDate;
    }
    if ("end_date" in entry) {
      nextEntry.end_date = nextEntry.endDate;
    }
    return nextEntry;
  });

  return { items: normalized, issues };
};

export const normalizeResumeWorkExperienceDates = (resume: any): any => {
  if (!resume || typeof resume !== "object" || Array.isArray(resume)) return resume;
  const source = resume as Record<string, unknown>;
  const nextResume: Record<string, unknown> = { ...source };

  ["workExperience", "work_experience", "experience"].forEach((key) => {
    if (!Array.isArray(source[key])) return;
    const normalized = normalizeResumeExperienceDates(source[key]);
    nextResume[key] = normalized.items;
  });

  return nextResume;
};
