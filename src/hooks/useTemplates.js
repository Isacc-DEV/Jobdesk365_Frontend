import { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "authToken";
const ENDPOINT = `${API_BASE}/templates`;

export const useTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTemplates = async (signal) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError("Missing token");
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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
        throw new Error(`Failed to load templates (${res.status})`);
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setTemplates(items);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Unable to load templates.");
        setTemplates([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadTemplates(controller.signal);
    return () => controller.abort();
  }, []);

  return { templates, loading, error, reload: () => loadTemplates() };
};
