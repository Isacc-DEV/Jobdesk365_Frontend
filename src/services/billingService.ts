/* global fetch */
import { API_BASE, TOKEN_KEY } from "../config";

export const USER_REFRESH_EVENT = "jobdesk:user-refresh";

const getToken = () => (typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null);

const resolveBase = () => (API_BASE ? `${API_BASE}/billing` : "/billing");

const apiFetch = async (path: string, options = {}) => {
  const token = getToken();
  if (!token) throw new Error("Missing token");
  const res = await fetch(`${resolveBase()}${path}`, {
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
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      message = (await res.text()) || message;
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
};

export const dispatchUserRefresh = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new window.Event(USER_REFRESH_EVENT));
};

export const billingService = {
  async createCheckout(amount: number) {
    return apiFetch("/topups/checkout", {
      method: "POST",
      body: JSON.stringify({ amount })
    });
  },
  async getTopupStatus(topupId: string, nowPaymentId?: string | null) {
    const npId = String(nowPaymentId || "").trim();
    const query = npId ? `?np_id=${encodeURIComponent(npId)}` : "";
    return apiFetch(`/topups/${encodeURIComponent(topupId)}${query}`, { method: "GET" });
  }
};
