import { useEffect, useState } from "react";
import { isJwtValid } from "../lib/auth";
import { TOKEN_KEY } from "../config";

export const useAuthGuard = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    const valid = isJwtValid(token);
    setIsAuthed(valid);
    setAuthChecked(true);

    if (!valid && typeof window !== "undefined") {
      const path = window.location.pathname || "/";
      const isPublicRoute = path === "/" || path.startsWith("/landing") || path.startsWith("/auth");
      if (!isPublicRoute) {
        window.location.href = "/auth";
      }
    }
  }, []);

  return { isAuthed, authChecked };
};
