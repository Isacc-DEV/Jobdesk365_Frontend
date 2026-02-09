const normalizeRoles = (roles: unknown): string[] =>
  Array.isArray(roles) ? roles.map((role) => String(role || "").toLowerCase()) : [];

export const hasAdminProfilesAccess = (roles: unknown): boolean =>
  normalizeRoles(roles).includes("admin");

export const hasManagerProfilesAccess = (roles: unknown): boolean =>
  normalizeRoles(roles).includes("manager");

export const hasElevatedProfilesAccess = (roles: unknown): boolean =>
  hasAdminProfilesAccess(roles) || hasManagerProfilesAccess(roles);

const normalizeBasePath = (basePath: string): string => {
  if (!basePath) return "/";
  if (basePath === "/") return "/";
  const withLeading = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeading.replace(/\/+$/, "");
};

export const getRoleScopedPathByRoles = (basePath: string, roles: unknown): string => {
  const normalizedBase = normalizeBasePath(basePath);
  if (hasAdminProfilesAccess(roles)) return `/admin${normalizedBase}`;
  if (hasManagerProfilesAccess(roles)) return `/manager${normalizedBase}`;
  return normalizedBase;
};

export const getProfilesRouteByRoles = (roles: unknown): string => {
  return getRoleScopedPathByRoles("/profiles", roles);
};

export const getProfilesEndpointPathByRoles = (roles: unknown): string => {
  return getRoleScopedPathByRoles("/profiles", roles);
};

export const getApplicationsRouteByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/applications", roles);

export const getApplicationsEndpointPathByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/applications", roles);

export const getInboxRouteByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/inbox", roles);

export const getEmailEndpointPathByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/email", roles);

export const getCalendarRouteByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/calendar", roles);

export const getCalendarEndpointPathByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/calendar", roles);

export const getRequestsRouteByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/requests", roles);

export const getHireEndpointPathByRoles = (roles: unknown): string =>
  getRoleScopedPathByRoles("/hire", roles);
