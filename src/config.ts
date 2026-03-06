const isProduction = Boolean(import.meta.env.PROD);

const ensureUrl = (value: string, name: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`[config] ${name} must be a valid absolute URL. Received: "${value}"`);
  }
};

const ensureOrigin = (value: string, name: string): string => {
  const normalized = ensureUrl(value, name);
  if (!normalized) return '';
  return new URL(normalized).origin;
};

const resolveApiBase = () => {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!raw) {
    if (isProduction) {
      throw new Error('[config] VITE_API_BASE_URL is required in production.');
    }
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/+$/, '');
    }
    return '';
  }
  return ensureUrl(raw, 'VITE_API_BASE_URL');
};

const API_BASE = resolveApiBase();

const rawBackendOrigin = (import.meta.env.VITE_BACKEND_ORIGIN || '').trim();
const BACKEND_ORIGIN = rawBackendOrigin
  ? ensureOrigin(rawBackendOrigin, 'VITE_BACKEND_ORIGIN')
  : API_BASE
  ? ensureOrigin(API_BASE, 'VITE_API_BASE_URL')
  : '';

const rawAiService = (import.meta.env.VITE_AI_SERVICE_URL || '').trim();
const AI_SERVICE_URL = rawAiService
  ? ensureUrl(rawAiService, 'VITE_AI_SERVICE_URL')
  : API_BASE
  ? `${API_BASE}/ai/resume-tailor`
  : '/ai/resume-tailor';

export { API_BASE, AI_SERVICE_URL, BACKEND_ORIGIN };
export const TOKEN_KEY = 'authToken';
