import {
  Briefcase,
  Calendar,
  ClipboardList,
  Crown,
  FileCode,
  FileText,
  LayoutDashboard,
  MessageSquare,
  UserCog,
  UserRound,
} from "lucide-react";
import type { NavigationItem } from "./types";

export const getAdminNavigation = (): NavigationItem[] => [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Profiles", icon: UserRound, href: "/admin/profiles" },
  { label: "Applications", icon: Briefcase, href: "/admin/applications" },
  { label: "Resume Generator", icon: FileText, href: "/resume-generator" },
  { label: "Resume Templates", icon: FileCode, href: "/resume-templates" },
  { label: "Calendar", icon: Calendar, href: "/admin/calendar" },
  { label: "Support", icon: MessageSquare, href: "/chat" },
  { label: "Requests", icon: ClipboardList, href: "/admin/requests" },
  { label: "Users", icon: UserCog, href: "/admin/users" },
  { label: "VIP Services", icon: Crown }
];
