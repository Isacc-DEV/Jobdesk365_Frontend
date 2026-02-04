const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");

const rawAiService = (import.meta.env.VITE_AI_SERVICE_URL || "").trim();

const rawBackendOrigin =
  (import.meta.env.VITE_BACKEND_ORIGIN || "").trim() || normalizedApiBase;

const resolveOrigin = (value: string) => {
  if (!value) {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
};

export const API_BASE = normalizedApiBase;
export const AI_SERVICE_URL =
  rawAiService || (API_BASE ? `${API_BASE}/ai/resume-tailor` : "/ai/resume-tailor");
export const BACKEND_ORIGIN = resolveOrigin(rawBackendOrigin);
export const TOKEN_KEY = "authToken";
