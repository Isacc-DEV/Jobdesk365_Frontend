export const parseJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window !== "undefined"
        ? window.atob(base64)
        : globalThis?.Buffer
          ? globalThis.Buffer.from(base64, "base64").toString("utf8")
          : "";
    const payload = json ? JSON.parse(json) : null;
    return payload;
  } catch {
    return null;
  }
};

export const isJwtValid = (token) => {
  const payload = parseJwt(token);
  if (!payload) return false;
  if (payload.exp && Number.isFinite(payload.exp)) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return false;
  }
  return true;
};
