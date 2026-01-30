import { useEffect, useState } from "react";
import { isJwtValid } from "../lib/auth";

const TOKEN_KEY = "authToken";

export const useAuthGuard = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    const valid = isJwtValid(token);
    setIsAuthed(valid);
    setAuthChecked(true);

    if (!valid && typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
      window.location.href = "/auth";
    }
  }, []);

  return { isAuthed, authChecked };
};
