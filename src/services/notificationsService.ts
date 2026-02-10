import { API_BASE, TOKEN_KEY } from "../config";

export type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  redirect_url: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  next_cursor: string | null;
  has_unread: boolean;
  unread_count: number;
};

const BASE = API_BASE ? `${API_BASE}/notifications` : "/notifications";

const getToken = () =>
  typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  if (!token) throw new Error("Missing token");

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/auth";
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
};

export const notificationsService = {
  async list(limit = 20, cursor?: string | null): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const data = await apiFetch(`/${query ? `?${query}` : ""}`, { method: "GET" });
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      next_cursor: data?.next_cursor ?? null,
      has_unread: Boolean(data?.has_unread),
      unread_count: Number(data?.unread_count ?? 0)
    };
  },

  async markAllRead(): Promise<number> {
    const data = await apiFetch("/mark-all-read", { method: "POST" });
    return Number(data?.updated_count ?? 0);
  }
};

