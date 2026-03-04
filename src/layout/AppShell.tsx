import { useState, type ReactNode } from "react";
import LiveChatCard from "../components/chat/LiveChatCard";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import type { NavigationItem } from "../navigation/types";

type AppShellProps = {
  route: string;
  navigate: (path: string) => void;
  searchPlaceholder: string;
  navigationItems: NavigationItem[];
  showLiveChat: boolean;
  showChatAlertControl: boolean;
  chatAlertPermission: "granted" | "denied" | "default" | "unsupported";
  onEnableChatAlerts: () => void;
  children: ReactNode;
};

const AppShell = ({
  route,
  navigate,
  searchPlaceholder,
  navigationItems,
  showLiveChat,
  showChatAlertControl,
  chatAlertPermission,
  onEnableChatAlerts,
  children
}: AppShellProps) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarWidth = sidebarExpanded ? 240 : 72;

  return (
    <div
      className="min-h-screen grid bg-page text-ink transition-[grid-template-columns] duration-200 ease-out"
      style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
    >
      <Sidebar
        items={navigationItems}
        expanded={sidebarExpanded}
        onExpand={() => setSidebarExpanded(true)}
        onCollapse={() => setSidebarExpanded(false)}
        currentRoute={route}
        onNavigate={navigate}
      />
      <div className="grid grid-rows-[64px_1fr] min-h-screen bg-page">
        <Header
          searchPlaceholder={searchPlaceholder}
          onNavigate={navigate}
          showChatAlertControl={showChatAlertControl}
          chatAlertPermission={chatAlertPermission}
          onEnableChatAlerts={onEnableChatAlerts}
        />
        {children}
      </div>
      {showLiveChat ? <LiveChatCard /> : null}
    </div>
  );
};

export default AppShell;
