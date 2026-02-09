import { API_BASE, TOKEN_KEY } from "../config";
import { getHireEndpointPathByRoles } from "../lib/profilesAccess";

const getToken = () => (typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null);

const resolveBase = (roles?: unknown) => {
  const endpointPath = getHireEndpointPathByRoles(roles);
  return API_BASE ? `${API_BASE}${endpointPath}` : endpointPath;
};

const apiFetch = async (path: string, options: RequestInit = {}, roles?: unknown) => {
  const token = getToken();
  if (!token) throw new Error("Missing token");
  const res = await fetch(`${resolveBase(roles)}${path}`, {
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
  async listTalents(role: "bidder" | "caller", options?: { roles?: unknown }) {
    const data = await apiFetch(`/talents?role=${encodeURIComponent(role)}`, { method: "GET" }, options?.roles);
    return Array.isArray(data?.items) ? data.items : [];
  },

  async listRequests(options?: { roles?: unknown; status?: "pending" | "working" | "closed" }) {
    const params = new URLSearchParams();
    if (options?.status) params.set("status", options.status);
    const query = params.toString();
    const data = await apiFetch(`/requests${query ? `?${query}` : ""}`, { method: "GET" }, options?.roles);
    return Array.isArray(data?.items) ? data.items : [];
  },

  async createRequest(payload: {
    role: "bidder" | "caller";
    detail?: any;
    assignee_user_id?: string | null;
    when_at?: string | null;
    status?: "pending" | "working" | "closed";
  }, options?: { roles?: unknown }) {
    return apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify(payload)
    }, options?.roles);
  },

  async updateRequest(
    requestId: string,
    payload: {
      status?: "pending" | "working" | "closed";
      assignee_user_id?: string | null;
      when_at?: string | null;
      detail?: any;
    },
    options?: { roles?: unknown }
  ) {
    return apiFetch(`/requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }, options?.roles);
  },

  async deleteRequest(requestId: string, options?: { roles?: unknown }) {
    return apiFetch(`/requests/${requestId}`, { method: "DELETE" }, options?.roles);
  },

  async createTalent(payload: {
    role: "bidder" | "caller";
    user_id?: string;
    email?: string;
    username?: string;
    name?: string;
    bio?: string;
    rate?: number;
  }, options?: { roles?: unknown }) {
    return apiFetch("/talents", {
      method: "POST",
      body: JSON.stringify(payload)
    }, options?.roles);
  },

  async searchUsers(query: string, options?: { roles?: unknown }) {
    const q = encodeURIComponent(query);
    const data = await apiFetch(`/users?q=${q}`, { method: "GET" }, options?.roles);
    return Array.isArray(data?.items) ? data.items : [];
  }
};
