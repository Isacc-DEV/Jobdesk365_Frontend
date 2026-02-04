import { API_BASE, TOKEN_KEY } from "../config";

const BASE = API_BASE ? `${API_BASE}/admin` : "/admin";

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

export const adminService = {
  async listUsers(query?: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const qs = params.toString();
    const data = await apiFetch(`/users${qs ? `?${qs}` : ""}`, { method: "GET" });
    return Array.isArray(data?.items) ? data.items : [];
  },

  async updateUserRole(
    userId: string,
    payload: { role: string; action: "add" | "remove" }
  ) {
    return apiFetch(`/users/${userId}/roles`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async deleteUser(userId: string) {
    return apiFetch(`/users/${userId}`, {
      method: "DELETE"
    });
  }
};
