import { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "authToken";
const ENDPOINT = `${API_BASE}/profiles`;

const normalizeProfile = (profile) => {
  const baseInfo = profile?.base_info || {};
  return {
    id: profile.id,
    name: profile.name,
    subtitle: profile.description || "No description yet",
    templateTitle: profile.resume_template_title || "",
    templateId: profile.resume_template_id,
    email: baseInfo.email || "",
    emailConnected: Boolean(profile.email_account_id),
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

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (!token) {
        setError("Missing token");
        setProfiles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(ENDPOINT, {
          signal: controller.signal,
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
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, []);

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

  return { profiles, loading, error, createProfile, updateProfile };
};
