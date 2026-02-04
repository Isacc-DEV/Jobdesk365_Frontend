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
  Shield,
  UserRound,
  Users
} from "lucide-react";
import { useUser } from "./useUser";

export const useNavigation = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin");
  const isAdminOrManager = roles.includes("admin") || roles.includes("manager");

  const items = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, href: "/" },
      { label: "Profiles", icon: UserRound, href: "/profiles" },
      { label: "Applications", icon: Briefcase, href: "/applications" },
      { label: "Resume Generator", icon: FileText, href: "/resume-generator" },
      ...(isAdminOrManager ? [{ label: "Resume Templates", icon: FileCode, href: "/resume-templates" }] : []),
      { label: "Inbox", icon: Inbox, href: "/inbox" },
      { label: "Calendar", icon: Calendar, href: "/calendar" },
      { label: "Requests", icon: ClipboardList, href: "/requests" },
      { label: "Hire Talents", icon: Users, href: "/hire-talents" },
      ...(isAdmin ? [{ label: "Admin", icon: Shield, href: "/admin" }] : []),
      { label: "VIP Services", icon: Crown }
    ],
    [isAdmin]
  );

  return items;
};
