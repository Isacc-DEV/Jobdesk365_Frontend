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
import type { NavigationItem } from "./types";

export const getAdminNavigation = (): NavigationItem[] => [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Profiles", icon: UserRound, href: "/admin/profiles" },
  { label: "Applications", icon: Briefcase, href: "/admin/applications" },
  { label: "Resume Generator", icon: FileText, href: "/resume-generator" },
  { label: "Resume Templates", icon: FileCode, href: "/resume-templates" },
  { label: "Inbox", icon: Inbox, href: "/admin/inbox" },
  { label: "Calendar", icon: Calendar, href: "/admin/calendar" },
  { label: "Support", icon: MessageSquare, href: "/chat" },
  { label: "Requests", icon: ClipboardList, href: "/admin/requests" },
  { label: "Hire Talents", icon: Users, href: "/hire-talents" },
  { label: "Admin", icon: Shield, href: "/admin" },
  { label: "VIP Services", icon: Crown }
];

