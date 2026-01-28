import { useEffect, useState } from "react";
import Header from "./components/layout/Header";
import MainPlaceholder from "./components/layout/MainPlaceholder";
import Sidebar from "./components/layout/Sidebar";
import AuthPage from "./components/auth/AuthPage";
import UserProfilePage from "./components/user/UserProfilePage";
import { useAuthGuard } from "./hooks/useAuthGuard";
import DashboardPage from "./components/dashboard/DashboardPage";

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
        <Header />
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

  if (isDashboardRoute) {
    return shell(<DashboardPage />);
  }

  return shell(<DashboardPage />);
};

export default App;
