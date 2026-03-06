/* global fetch */
import { useState, useEffect, useCallback } from "react";
import { API_BASE, TOKEN_KEY } from "../config";
import { USER_REFRESH_EVENT } from "../services/billingService";

export const useUser = (options = {}) => {
  const { enabled = true, redirectOnUnauthorized = true } = options;
  const workerBlockMessage = "plz contact to support team and get verified as internal worker";
  const accountBlockedMessage = "Your account is blocked. Please contact support team.";
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const normalizeUser = useCallback((parsedUser) => {
    const roles = Array.isArray(parsedUser?.roles) ? parsedUser.roles : [];
    const badges = Array.isArray(parsedUser?.badges) ? parsedUser.badges : [];
    const hasManagerBadge =
      roles.includes("worker") && badges.some((badge) => String(badge || "").toLowerCase() === "manager");
    return hasManagerBadge && !roles.includes("manager")
      ? { ...parsedUser, roles: [...roles, "manager"] }
      : parsedUser;
  }, []);

  const reloadUser = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError("");
      return null;
    }

    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setLoading(false);
      setError("Missing token");
      return null;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 && redirectOnUnauthorized) {
        window.location.href = "/auth";
        return null;
      }
      if (!res.ok) {
        let message = "Unable to load profile.";
        try {
          const data = await res.json();
          if (data?.error === "worker_not_verified") {
            message = workerBlockMessage;
          } else if (data?.error === "account_blocked") {
            message = accountBlockedMessage;
          } else {
            message = data?.message || data?.error || message;
          }
        } catch {
          message = (await res.text()) || message;
        }
        throw new Error(message);
      }
      const data = await res.json();
      const parsedUser = data?.user ?? data;
      const nextUser = normalizeUser(parsedUser);
      setUser(nextUser);
      setError("");
      return nextUser;
    } catch (err) {
      setUser(null);
      setError(err.message || "Unable to load profile.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    accountBlockedMessage,
    enabled,
    normalizeUser,
    redirectOnUnauthorized,
    workerBlockMessage
  ]);

  useEffect(() => {
    void reloadUser();
  }, [reloadUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleRefresh = () => {
      void reloadUser();
    };
    window.addEventListener(USER_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(USER_REFRESH_EVENT, handleRefresh);
    };
  }, [reloadUser]);

  const updateUser = async (partial) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token || !user) return null;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(partial || {})
      });
      if (res.status === 401) {
        if (redirectOnUnauthorized) {
          window.location.href = "/auth";
          return null;
        }
        setError("Unauthorized");
        return null;
      }
      if (!res.ok) {
        throw new Error((await res.text()) || "Unable to save profile.");
      }
      const updated = await res.json();
      const parsedUser = updated?.user ?? updated;
      const nextUser = normalizeUser(parsedUser);
      setUser(nextUser);
      setError("");
      return nextUser;
    } catch (err) {
      setError(err.message || "Unable to save profile.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { user, loading, error, saving, updateUser, reloadUser };
};
