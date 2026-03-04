export type RoleBucket = "user" | "manager" | "admin";

const normalizeRoles = (roles: unknown): string[] =>
  Array.isArray(roles) ? roles.map((role) => String(role || "").toLowerCase()) : [];

const normalizeBadges = (badges: unknown): string[] =>
  Array.isArray(badges) ? badges.map((badge) => String(badge || "").toLowerCase()) : [];

export const getRoleBucketFromRoles = (roles: unknown, badges?: unknown): RoleBucket => {
  const normalized = normalizeRoles(roles);
  const badgeSet = normalizeBadges(badges);
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("manager")) return "manager";
  if (normalized.includes("worker") && badgeSet.includes("manager")) return "manager";
  return "user";
};

export const isEmployeeByRoles = (roles: unknown): boolean => {
  const normalized = normalizeRoles(roles);
  return normalized.some((role) => role === "admin" || role === "worker");
};
