import { useMemo } from "react";
import {
  Activity,
  Calendar,
  Crown,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserRound,
  Users
} from "lucide-react";

export const useNavigation = () => {
  const items = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, href: "/" },
      { label: "Profiles", icon: UserRound, href: "/profiles" },
      { label: "Inbox", icon: Inbox, href: "/inbox" },
      { label: "Calendar", icon: Calendar, href: "/calendar" },
      { label: "Chat", icon: MessageSquare, href: "/chat" },
      { label: "Hire People", icon: Users },
      { label: "VIP Services", icon: Crown },
      { label: "Activity", icon: Activity },
      { label: "Settings", icon: Settings, href: "/settings" }
    ],
    []
  );

  return items;
};
