/* global fetch */
import { useState, useEffect } from "react";
import { API_BASE, TOKEN_KEY } from "../config";

export const useUser = (options = {}) => {
  const { enabled = true, redirectOnUnauthorized = true } = options;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError("");
      return;
    }

    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setLoading(false);
      setError("Missing token");
      return;
    }
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401 && redirectOnUnauthorized) {
          window.location.href = "/auth";
          return;
        }
        if (!res.ok) {
          throw new Error((await res.text()) || "Unable to load profile.");
        }
        const data = await res.json();
        const parsedUser = data?.user ?? data;
        setUser(parsedUser);
      } catch (err) {
        setError(err.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [enabled, redirectOnUnauthorized]);

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
      const nextUser = updated?.user ?? updated;
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

  return { user, loading, error, saving, updateUser };
};
