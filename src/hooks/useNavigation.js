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
      { label: "Inbox", icon: Inbox },
      { label: "Calendar", icon: Calendar },
      { label: "Chat", icon: MessageSquare },
      { label: "Hire People", icon: Users },
      { label: "VIP Services", icon: Crown },
      { label: "Activity", icon: Activity },
      { label: "Settings", icon: Settings }
    ],
    []
  );

  return items;
};
