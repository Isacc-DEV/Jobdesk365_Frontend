const normalizeRoles = (roles: unknown): string[] =>
  Array.isArray(roles) ? roles.map((role) => String(role || "").toLowerCase()) : [];
const normalizeBadges = (badges: unknown): string[] =>
  Array.isArray(badges) ? badges.map((badge) => String(badge || "").toLowerCase()) : [];

export const hasAdminProfilesAccess = (roles: unknown): boolean =>
  normalizeRoles(roles).includes("admin");

export const hasManagerProfilesAccess = (roles: unknown, badges?: unknown): boolean => {
  const roleSet = normalizeRoles(roles);
  const badgeSet = normalizeBadges(badges);
  return roleSet.includes("manager") || (roleSet.includes("worker") && badgeSet.includes("manager"));
};

export const hasElevatedProfilesAccess = (roles: unknown, badges?: unknown): boolean =>
  hasAdminProfilesAccess(roles) || hasManagerProfilesAccess(roles, badges);

const normalizeBasePath = (basePath: string): string => {
  if (!basePath) return "/";
  if (basePath === "/") return "/";
  const withLeading = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeading.replace(/\/+$/, "");
};

export const getRoleScopedPathByRoles = (
  basePath: string,
  roles: unknown,
  badges?: unknown
): string => {
  const normalizedBase = normalizeBasePath(basePath);
  if (hasAdminProfilesAccess(roles)) return `/admin${normalizedBase}`;
  if (hasManagerProfilesAccess(roles, badges)) return `/manager${normalizedBase}`;
  return normalizedBase;
};

export const getProfilesRouteByRoles = (roles: unknown, badges?: unknown): string => {
  return getRoleScopedPathByRoles("/profiles", roles, badges);
};

export const getProfilesEndpointPathByRoles = (roles: unknown, badges?: unknown): string => {
  return getRoleScopedPathByRoles("/profiles", roles, badges);
};

export const getApplicationsRouteByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/applications", roles, badges);

export const getApplicationsEndpointPathByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/applications", roles, badges);

export const getInboxRouteByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/inbox", roles, badges);

export const getEmailEndpointPathByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/email", roles, badges);

export const getCalendarRouteByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/calendar", roles, badges);

export const getCalendarEndpointPathByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/calendar", roles, badges);

export const getRequestsRouteByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/requests", roles, badges);

export const getHireEndpointPathByRoles = (roles: unknown, badges?: unknown): string =>
  getRoleScopedPathByRoles("/hire", roles, badges);
