import { useMemo } from "react";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  Crown,
  FileCode,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Shield,
  UserRound,
  Users
} from "lucide-react";
import { useUser } from "./useUser";
import {
  getApplicationsRouteByRoles,
  getCalendarRouteByRoles,
  getInboxRouteByRoles,
  getProfilesRouteByRoles,
  getRequestsRouteByRoles
} from "../lib/profilesAccess";

export const useNavigation = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin");
  const isAdminOrManager = roles.includes("admin") || roles.includes("manager");
  const isEmployee = roles.some((role) => role === "admin" || role === "manager" || role === "worker");
  const profilesRoute = getProfilesRouteByRoles(roles);
  const applicationsRoute = getApplicationsRouteByRoles(roles);
  const inboxRoute = getInboxRouteByRoles(roles);
  const calendarRoute = getCalendarRouteByRoles(roles);
  const requestsRoute = getRequestsRouteByRoles(roles);

  const items = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Profiles", icon: UserRound, href: profilesRoute },
      { label: "Applications", icon: Briefcase, href: applicationsRoute },
      { label: "Resume Generator", icon: FileText, href: "/resume-generator" },
      ...(isAdminOrManager ? [{ label: "Resume Templates", icon: FileCode, href: "/resume-templates" }] : []),
      { label: "Inbox", icon: Inbox, href: inboxRoute },
      { label: "Calendar", icon: Calendar, href: calendarRoute },
      ...(isEmployee ? [{ label: "Support", icon: MessageSquare, href: "/chat" }] : []),
      { label: "Requests", icon: ClipboardList, href: requestsRoute },
      { label: "Hire Talents", icon: Users, href: "/hire-talents" },
      ...(isAdmin ? [{ label: "Admin", icon: Shield, href: "/admin" }] : []),
      { label: "VIP Services", icon: Crown }
    ],
    [
      applicationsRoute,
      calendarRoute,
      inboxRoute,
      isAdmin,
      isEmployee,
      isAdminOrManager,
      profilesRoute,
      requestsRoute
    ]
  );

  return items;
};
