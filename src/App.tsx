import { useCallback, useEffect, useState } from "react";
import AuthPage from "./components/auth/AuthPage";
import LiveChatCard from "./components/chat/LiveChatCard";
import LandingPage from "./components/landing/LandingPage";
import { TOKEN_KEY } from "./config";
import { useAuthGuard } from "./hooks/useAuthGuard";
import { useChatAlerts } from "./hooks/useChatAlerts";
import { useUser } from "./hooks/useUser";
import AppShell from "./layout/AppShell";
import { getRoleBucketFromRoles, isEmployeeByRoles } from "./lib/roleBucket";
import { getSearchPlaceholder } from "./lib/searchPlaceholder";
import { useRoleNavigation } from "./navigation/useRoleNavigation";
import AdminRoutes from "./pages/admin/AdminRoutes";
import ManagersRoutes from "./pages/managers/ManagersRoutes";
import UsersRoutes from "./pages/users/UsersRoutes";

const App = () => {
  const initialPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const [route, setRoute] = useState(initialPath);

  const navigate = useCallback((path: string) => {
    if (!path) return;
    if (typeof window !== "undefined") {
      if (window.location.pathname === path) {
        setRoute(path);
        return;
      }
      window.history.pushState({}, "", path);
      setRoute(path);
      return;
    }
    setRoute(path);
  }, []);

  useEffect(() => {
    const handler = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const isAuthRoute = route.startsWith("/auth");
  const isLandingRoute = route === "/" || route.startsWith("/landing");

  const { isAuthed, authChecked } = useAuthGuard();
  const { user, loading: userLoading } = useUser({ enabled: isAuthed, redirectOnUnauthorized: false });
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const roleBucket = getRoleBucketFromRoles(roles);
  const isEmployee = isEmployeeByRoles(roles);
  const navigationItems = useRoleNavigation(roles);

  const showLiveChat = !isAuthed || (!userLoading && !isEmployee);
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

  const {
    permission: chatAlertPermission,
    requestPermission: requestChatAlertPermission,
    clearUnseen: clearChatAlerts
  } = useChatAlerts({
    enabled: Boolean(isAuthed && !userLoading && isEmployee && token),
    token,
    userId: user?.id,
    route,
    onNavigate: navigate
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const maybeClear = () => {
      const onChatRoute = route.startsWith("/chat");
      if (!onChatRoute) return;
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      clearChatAlerts();
    };

    maybeClear();
    window.addEventListener("focus", maybeClear);
    document.addEventListener("visibilitychange", maybeClear);
    return () => {
      window.removeEventListener("focus", maybeClear);
      document.removeEventListener("visibilitychange", maybeClear);
    };
  }, [clearChatAlerts, route]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-page text-ink flex items-center justify-center">
        <p className="text-ink-muted">Checking session...</p>
      </div>
    );
  }

  if (isAuthRoute) {
    return (
      <>
        <AuthPage />
        {showLiveChat ? <LiveChatCard /> : null}
      </>
    );
  }

  if (!isAuthed) {
    if (isLandingRoute) {
      return (
        <>
          <LandingPage onNavigate={navigate} />
          {showLiveChat ? <LiveChatCard /> : null}
        </>
      );
    }
    return (
      <>
        <AuthPage />
        {showLiveChat ? <LiveChatCard /> : null}
      </>
    );
  }

  if (isLandingRoute) {
    return (
      <>
        <LandingPage onNavigate={navigate} />
        {showLiveChat ? <LiveChatCard /> : null}
      </>
    );
  }

  const searchPlaceholder = getSearchPlaceholder(route);

  const roleContent =
    roleBucket === "admin" ? (
      <AdminRoutes route={route} userLoading={userLoading} navigate={navigate} />
    ) : roleBucket === "manager" ? (
      <ManagersRoutes route={route} userLoading={userLoading} navigate={navigate} />
    ) : (
      <UsersRoutes route={route} userLoading={userLoading} navigate={navigate} />
    );

  return (
    <AppShell
      route={route}
      navigate={navigate}
      searchPlaceholder={searchPlaceholder}
      navigationItems={navigationItems}
      showLiveChat={showLiveChat}
      showChatAlertControl={isEmployee}
      chatAlertPermission={chatAlertPermission}
      onEnableChatAlerts={() => {
        void requestChatAlertPermission();
      }}
    >
      {roleContent}
    </AppShell>
  );
};

export default App;
