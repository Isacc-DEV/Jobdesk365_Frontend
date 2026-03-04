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
  UserRound,
  Users
} from "lucide-react";
import type { NavigationItem } from "./types";

export const getManagersNavigation = (): NavigationItem[] => [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Profiles", icon: UserRound, href: "/manager/profiles" },
  { label: "Applications", icon: Briefcase, href: "/manager/applications" },
  { label: "Resume Generator", icon: FileText, href: "/resume-generator" },
  { label: "Resume Templates", icon: FileCode, href: "/resume-templates" },
  { label: "Inbox", icon: Inbox, href: "/manager/inbox" },
  { label: "Calendar", icon: Calendar, href: "/manager/calendar" },
  { label: "Support", icon: MessageSquare, href: "/chat" },
  { label: "Requests", icon: ClipboardList, href: "/manager/requests" },
  { label: "Hire Talents", icon: Users, href: "/hire-talents" },
  { label: "VIP Services", icon: Crown }
];

