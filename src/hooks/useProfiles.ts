import { useCallback, useEffect, useState } from "react";
import { API_BASE, TOKEN_KEY } from "../config";

const formatNextInterview = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatName = (value?: string | null) => (value && value.trim() ? value.trim() : "");

const normalizeProfile = (profile) => {
  const baseInfo = profile?.base_info || {};
  const statusValue = profile?.email_connection_status || profile?.email_status || "";
  const normalizedStatus = String(statusValue).toLowerCase();
  const connectedByStatus =
    normalizedStatus === "active" || normalizedStatus === "connected";
  const emailAddress = profile?.email_address || baseInfo.email || "";
  const unreadValue = profile?.unread_count ?? baseInfo.unread_count ?? 0;
  const nextInterviewValue = profile?.next_interview ?? baseInfo.next_interview ?? null;
  const assignedBidderLabel =
    formatName(profile?.assigned_bidder_display_name) ||
    formatName(profile?.assigned_bidder_username) ||
    formatName(profile?.assigned_bidder_email) ||
    (profile?.assigned_bidder_user_id ? String(profile.assigned_bidder_user_id) : "");
  const ownerUsername =
    formatName(profile?.owner_username) ||
    formatName(profile?.owner_display_name) ||
    formatName(profile?.owner_email) ||
    (profile?.user_id ? String(profile.user_id) : "");
  const isOwner = Boolean(profile?.is_owner);
  const isAssignedToCurrentUser = Boolean(profile?.is_assigned_to_current_user);
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
    bidder: assignedBidderLabel,
    assignedBidderLabel,
    assignedBidderId: profile.assigned_bidder_user_id || "",
    isOwner,
    isAssignedToCurrentUser,
    ownerUsername,
    unreadCount: Number(unreadValue || 0),
    nextInterview: formatNextInterview(nextInterviewValue),
    status: baseInfo.status || "Draft",
    raw: profile
  };
};

type LoadProfilesOptions = {
  signal?: AbortSignal;
  showLoading?: boolean;
};

type UseProfilesOptions = {
  scope?: string;
  endpointPath?: string;
};

export const useProfiles = (options: UseProfilesOptions = {}) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scope = options.scope;
  const endpointPath = options.endpointPath || "/profiles";
  const normalizedEndpointPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  const endpoint = API_BASE ? `${API_BASE}${normalizedEndpointPath}` : normalizedEndpointPath;
  const listEndpoint = scope ? `${endpoint}?scope=${encodeURIComponent(scope)}` : endpoint;

  const loadProfiles = useCallback(
    async ({ signal, showLoading }: LoadProfilesOptions = {}) => {
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
        const res = await fetch(listEndpoint, {
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
    [listEndpoint]
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
    const res = await fetch(endpoint, {
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
    const res = await fetch(`${endpoint}/${profileId}`, {
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

  const deleteProfile = async (profileId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${endpoint}/${profileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to delete profile.");
    }
    setProfiles((prev) => prev.filter((item) => item.id !== profileId));
  };

  const fetchProfile = useCallback(async (profileId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${endpoint}/${profileId}`, {
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
  }, [endpoint]);

  const startOutlookConnect = useCallback(async (profileId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${endpoint}/${profileId}/email/outlook/authorize`, {
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
  }, [endpoint]);

  const refreshProfiles = useCallback(async () => {
    await loadProfiles({ showLoading: false });
  }, [loadProfiles]);

  const assignBidder = async (profileId, bidderUserId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${endpoint}/${profileId}/assign-bidder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bidder_user_id: bidderUserId })
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to assign employee.");
    }
    const updated = await res.json();
    const normalized = normalizeProfile(updated);
    setProfiles((prev) => prev.map((item) => (item.id === profileId ? normalized : item)));
    return normalized;
  };

  const unassignBidder = async (profileId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token");
    }
    const res = await fetch(`${endpoint}/${profileId}/unassign-bidder`, {
      method: "POST",
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
      throw new Error(text || "Unable to unassign employee.");
    }
    const updated = await res.json();
    const normalized = normalizeProfile(updated);
    setProfiles((prev) => prev.map((item) => (item.id === profileId ? normalized : item)));
    return normalized;
  };

  return {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchProfile,
    startOutlookConnect,
    refreshProfiles,
    assignBidder,
    unassignBidder
  };
};
