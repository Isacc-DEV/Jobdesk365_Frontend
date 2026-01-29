import { useEffect, useState } from "react";
import Header from "./components/layout/Header";
import MainPlaceholder from "./components/layout/MainPlaceholder";
import Sidebar from "./components/layout/Sidebar";
import AuthPage from "./components/auth/AuthPage";
import UserProfilePage from "./components/user/UserProfilePage";
import { useAuthGuard } from "./hooks/useAuthGuard";
import DashboardPage from "./components/dashboard/DashboardPage";
import InboxPage from "./components/inbox/InboxPage";
import CalendarPage from "./components/calendar/CalendarPage";
import ChatPage from "./components/chat/ChatPage";
import SettingsPage from "./components/settings/SettingsPage";

const App = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarWidth = sidebarExpanded ? 240 : 72;
  const initialPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const [route, setRoute] = useState(initialPath);

  const navigate = (path) => {
    if (typeof window !== "undefined" && path) {
      window.history.pushState({}, "", path);
      setRoute(path);
    }
  };

  useEffect(() => {
    const handler = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const isAuthRoute = route.startsWith("/auth");
  const isUserRoute = route.startsWith("/user");
  const isProfilesRoute = route.startsWith("/profiles");
  const isInboxRoute = route.startsWith("/inbox");
  const isCalendarRoute = route.startsWith("/calendar");
  const isChatRoute = route.startsWith("/chat");
  const isSettingsRoute = route.startsWith("/settings");
  const isDashboardRoute = route === "/" || route === "/dashboard";
  const { isAuthed, authChecked } = useAuthGuard();

  if (!authChecked) {
    return null;
  }

  if (isAuthRoute) {
    return <AuthPage />;
  }

  if (!isAuthed) {
    return null;
  }

  const searchPlaceholder = isInboxRoute
    ? "Search emails..."
    : isCalendarRoute
    ? "Search events..."
    : isChatRoute
    ? "Search conversations..."
    : isSettingsRoute
    ? "Search settings..."
    : "Search profiles, emails, people...";

  const shell = (content) => (
    <div
      className="min-h-screen grid bg-page text-ink transition-[grid-template-columns] duration-200 ease-out"
      style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
    >
      <Sidebar
        expanded={sidebarExpanded}
        onExpand={() => setSidebarExpanded(true)}
        onCollapse={() => setSidebarExpanded(false)}
        currentRoute={route}
        onNavigate={navigate}
      />
      <div className="grid grid-rows-[64px_1fr] min-h-screen bg-page">
        <Header searchPlaceholder={searchPlaceholder} onNavigate={navigate} />
        {content}
      </div>
    </div>
  );

  if (isUserRoute) {
    return shell(<UserProfilePage />);
  }

  if (isProfilesRoute) {
    return shell(<MainPlaceholder />);
  }

  if (isInboxRoute) {
    return shell(<InboxPage />);
  }

  if (isCalendarRoute) {
    return shell(<CalendarPage />);
  }

  if (isChatRoute) {
    return shell(<ChatPage />);
  }

  if (isSettingsRoute) {
    return shell(<SettingsPage />);
  }

  if (isDashboardRoute) {
    return shell(<DashboardPage />);
  }

  return shell(<DashboardPage />);
};

export default App;
