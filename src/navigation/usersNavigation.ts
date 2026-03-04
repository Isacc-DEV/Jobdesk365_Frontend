import {
  Briefcase,
  Calendar,
  ClipboardList,
  Crown,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  UserRound,
  Users
} from "lucide-react";
import type { NavigationItem } from "./types";

type UsersNavigationOptions = {
  includeSupport?: boolean;
};

export const getUsersNavigation = ({
  includeSupport = false
}: UsersNavigationOptions = {}): NavigationItem[] => [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Profiles", icon: UserRound, href: "/profiles" },
  { label: "Applications", icon: Briefcase, href: "/applications" },
  { label: "Resume Generator", icon: FileText, href: "/resume-generator" },
  { label: "Inbox", icon: Inbox, href: "/inbox" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  ...(includeSupport ? [{ label: "Support", icon: MessageSquare, href: "/chat" }] : []),
  { label: "Requests", icon: ClipboardList, href: "/requests" },
  { label: "Talents", icon: Users, href: "/hire-talents" },
  { label: "VIP Services", icon: Crown }
];
