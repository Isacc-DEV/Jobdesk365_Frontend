import type { RoleBucket } from "./roleBucket";

export type SectionKey = "profiles" | "applications" | "inbox" | "calendar" | "requests";

export const SECTION_BASE_PATHS: Record<SectionKey, string> = {
  profiles: "/profiles",
  applications: "/applications",
  inbox: "/inbox",
  calendar: "/calendar",
  requests: "/requests"
};

export const isTalentsRoute = (path: string): boolean =>
  path.startsWith("/hire-talents") || path.startsWith("/hire-talent");

export const isLegacyHireRequestsRoute = (path: string): boolean =>
  path.startsWith("/hire") && !isTalentsRoute(path);

export const isProfilesRoute = (path: string): boolean =>
  path.startsWith("/profiles") || path.startsWith("/manager/profiles") || path.startsWith("/admin/profiles");

export const isApplicationsRoute = (path: string): boolean =>
  path.startsWith("/applications") ||
  path.startsWith("/manager/applications") ||
  path.startsWith("/admin/applications");

export const isInboxRoute = (path: string): boolean =>
  path.startsWith("/inbox") || path.startsWith("/manager/inbox") || path.startsWith("/admin/inbox");

export const isCalendarRoute = (path: string): boolean =>
  path.startsWith("/calendar") ||
  path.startsWith("/manager/calendar") ||
  path.startsWith("/admin/calendar");

export const isRequestsRoute = (path: string): boolean =>
  path.startsWith("/requests") ||
  path.startsWith("/manager/requests") ||
  path.startsWith("/admin/requests") ||
  isLegacyHireRequestsRoute(path);

export const detectSectionFromPath = (path: string): SectionKey | null => {
  if (isProfilesRoute(path)) return "profiles";
  if (isApplicationsRoute(path)) return "applications";
  if (isInboxRoute(path)) return "inbox";
  if (isCalendarRoute(path)) return "calendar";
  if (isRequestsRoute(path)) return "requests";
  return null;
};

export const getScopedSectionPath = (section: SectionKey, roleBucket: RoleBucket): string => {
  const basePath = SECTION_BASE_PATHS[section];
  if (roleBucket === "admin") return `/admin${basePath}`;
  if (roleBucket === "manager") return `/manager${basePath}`;
  return basePath;
};

export const getCanonicalSectionPath = (path: string, roleBucket: RoleBucket): string | null => {
  const section = detectSectionFromPath(path);
  if (!section) return null;
  return getScopedSectionPath(section, roleBucket);
};

export const isSectionRoute = (path: string): boolean => detectSectionFromPath(path) !== null;

export const isAdminRoute = (path: string): boolean => path.startsWith("/admin") && !isSectionRoute(path);

