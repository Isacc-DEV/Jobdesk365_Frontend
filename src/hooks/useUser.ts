/* global fetch */
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "authToken";

export const useUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setLoading(false);
      setError("Missing token");
      return;
    }
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
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
  }, []);

  const updateUser = async (partial) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token || !user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...user, ...partial })
      });
      if (res.status === 401) {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) {
        throw new Error((await res.text()) || "Unable to save profile.");
      }
      const updated = await res.json();
      setUser(updated);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return { user, loading, error, saving, updateUser };
};
