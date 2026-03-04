import {
  isAdminRoute,
  isApplicationsRoute,
  isCalendarRoute,
  isInboxRoute,
  isRequestsRoute,
  isTalentsRoute
} from "./sectionRoutes";

export const getSearchPlaceholder = (route: string): string => {
  if (isInboxRoute(route)) return "Search emails...";
  if (isCalendarRoute(route)) return "Search events...";
  if (route.startsWith("/settings")) return "Search settings...";
  if (route.startsWith("/resume-generator")) return "Search profiles, job descriptions...";
  if (route.startsWith("/resume-templates")) return "Search templates...";
  if (isApplicationsRoute(route)) return "Search applications...";
  if (isRequestsRoute(route)) return "Search requests...";
  if (isTalentsRoute(route)) return "Search talents...";
  if (isAdminRoute(route)) return "Search users...";
  if (route.startsWith("/chat")) return "Search threads...";
  return "Search profiles, emails, people...";
};

