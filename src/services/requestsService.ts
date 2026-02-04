import { API_BASE, TOKEN_KEY } from "../config";

const BASE = API_BASE ? `${API_BASE}/hire` : "/hire";

const getToken = () => (typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null);

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  if (!token) throw new Error("Missing token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/auth";
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
};

export const requestsService = {
  async listTalents(role: "bidder" | "caller") {
    const data = await apiFetch(`/talents?role=${encodeURIComponent(role)}`, { method: "GET" });
    return Array.isArray(data?.items) ? data.items : [];
  },

  async listRequests(options?: { scope?: "all"; status?: "pending" | "working" | "closed" }) {
    const params = new URLSearchParams();
    if (options?.scope) params.set("scope", options.scope);
    if (options?.status) params.set("status", options.status);
    const query = params.toString();
    const data = await apiFetch(`/requests${query ? `?${query}` : ""}`, { method: "GET" });
    return Array.isArray(data?.items) ? data.items : [];
  },

  async createRequest(payload: {
    role: "bidder" | "caller";
    detail?: any;
    assignee_user_id?: string | null;
    when_at?: string | null;
    status?: "pending" | "working" | "closed";
  }) {
    return apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async updateRequest(
    requestId: string,
    payload: {
      status?: "pending" | "working" | "closed";
      assignee_user_id?: string | null;
      when_at?: string | null;
      detail?: any;
    }
  ) {
    return apiFetch(`/requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  async deleteRequest(requestId: string) {
    return apiFetch(`/requests/${requestId}`, { method: "DELETE" });
  },

  async createTalent(payload: {
    role: "bidder" | "caller";
    user_id?: string;
    email?: string;
    username?: string;
    name?: string;
    bio?: string;
    rate?: number;
  }) {
    return apiFetch("/talents", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async searchUsers(query: string) {
    const q = encodeURIComponent(query);
    const data = await apiFetch(`/users?q=${q}`, { method: "GET" });
    return Array.isArray(data?.items) ? data.items : [];
  }
};
