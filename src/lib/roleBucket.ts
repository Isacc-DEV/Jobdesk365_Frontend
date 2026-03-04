export type RoleBucket = "user" | "manager" | "admin";

const normalizeRoles = (roles: unknown): string[] =>
  Array.isArray(roles) ? roles.map((role) => String(role || "").toLowerCase()) : [];

export const getRoleBucketFromRoles = (roles: unknown): RoleBucket => {
  const normalized = normalizeRoles(roles);
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("manager")) return "manager";
  return "user";
};

export const isEmployeeByRoles = (roles: unknown): boolean => {
  const normalized = normalizeRoles(roles);
  return normalized.some((role) => role === "admin" || role === "manager" || role === "worker");
};

