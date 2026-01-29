import { useCallback, useEffect, useState } from "react";

const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "authToken";
const ENDPOINT = `${API_BASE}/profiles`;

const normalizeProfile = (profile) => {
  const baseInfo = profile?.base_info || {};
  const statusValue = profile?.email_connection_status || profile?.email_status || "";
  const normalizedStatus = String(statusValue).toLowerCase();
  const connectedByStatus =
    normalizedStatus === "active" || normalizedStatus === "connected";
  const emailAddress = profile?.email_address || baseInfo.email || "";
  return {
    id: profile.id,
    name: profile.name,
    subtitle: profile.description || "No description yet",
    templateTitle: profile.resume_template_title || "",
    templateId: profile.resume_template_id,
    email: emailAddress,
    emailConnected: normalizedStatus
      ? connectedByStatus
      : Boolean(profile.email_account_id),
    bidder: profile.assigned_bidder_user_id ? "Assigned" : "",
    unreadCount: baseInfo.unread_count ?? 0,
    nextInterview: baseInfo.next_interview ?? null,
    status: baseInfo.status || "Draft",
    raw: profile
  };
};

export const useProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfiles = useCallback(
    async ({ signal, showLoading } = {}) => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (!token) {
        setError("Missing token");
        setProfiles([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoading !== false) {
          setLoading(true);
        }
        setError(null);
        const res = await fetch(ENDPOINT, {
          signal,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.status === 401 && typeof window !== "undefined") {
          window.location.href = "/auth";
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to load profiles (${res.status})`);
        }
        const data = await res.json();
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setProfiles(items.map(normalizeProfile));
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load profiles.");
          setProfiles([]);
          // eslint-disable-next-line no-console
          console.error("Error loading profiles", err);
        }
      } finally {
        if (showLoading !== false) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadProfiles({ signal: controller.signal });
    return () => controller.abort();
  }, [loadProfiles]);

  const createProfile = async (payload) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to create profile.");
    }
    const created = await res.json();
    const normalized = normalizeProfile(created);
    setProfiles((prev) => [normalized, ...prev]);
    return normalized;
  };

  const updateProfile = async (profileId, payload) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${ENDPOINT}/${profileId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to update profile.");
    }
    const updated = await res.json();
    const normalized = normalizeProfile(updated);
    setProfiles((prev) => prev.map((item) => (item.id === profileId ? normalized : item)));
    return normalized;
  };

  const fetchProfile = useCallback(async (profileId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${ENDPOINT}/${profileId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to fetch profile.");
    }
    const updated = await res.json();
    const normalized = normalizeProfile(updated);
    setProfiles((prev) => {
      const index = prev.findIndex((item) => item.id === profileId);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = normalized;
      return next;
    });
    return normalized;
  }, []);

  const startOutlookConnect = useCallback(async (profileId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${ENDPOINT}/${profileId}/email/outlook/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to start Outlook connection.");
    }
    const data = await res.json();
    if (!data?.url) {
      throw new Error("Missing authorization URL.");
    }
    return data.url;
  }, []);

  const refreshProfiles = useCallback(async () => {
    await loadProfiles({ showLoading: false });
  }, [loadProfiles]);

  return {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    fetchProfile,
    startOutlookConnect,
    refreshProfiles
  };
};