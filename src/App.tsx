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
import SettingsPage from "./components/settings/SettingsPage";
import ResumeGeneratorPage from "./components/resume/ResumeGeneratorPage";
import ResumeTemplatesPage from "./components/resume/ResumeTemplatesPage";
import ApplicationsPage from "./components/applications/ApplicationsPage";
import RequestsPage from "./components/hire/RequestsPage";
import TalentsPage from "./components/hire/TalentsPage";
import AdminPage from "./components/admin/AdminPage";
import LandingPage from "./components/landing/LandingPage";

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
  const isLandingRoute = route === "/" || route.startsWith("/landing");
  const isUserRoute = route.startsWith("/user");
  const isProfilesRoute = route.startsWith("/profiles");
  const isInboxRoute = route.startsWith("/inbox");
  const isCalendarRoute = route.startsWith("/calendar");
  const isSettingsRoute = route.startsWith("/settings");
  const isResumeGeneratorRoute = route.startsWith("/resume-generator");
  const isResumeTemplatesRoute = route.startsWith("/resume-templates");
  const isApplicationsRoute = route.startsWith("/applications");
  const isTalentsRoute = route.startsWith("/hire-talents");
  const isRequestsRoute = route.startsWith("/requests") || (route.startsWith("/hire") && !isTalentsRoute);
  const isAdminRoute = route.startsWith("/admin");
  const isDashboardRoute = route === "/" || route === "/dashboard";
  const { isAuthed, authChecked } = useAuthGuard();

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-page text-ink flex items-center justify-center">
        <p className="text-ink-muted">Checking session...</p>
      </div>
    );
  }

  if (isAuthRoute) {
    return <AuthPage />;
  }

  if (!isAuthed) {
    if (isLandingRoute) {
      return <LandingPage onNavigate={navigate} />;
    }
    return <AuthPage />;
  }

  const searchPlaceholder = isInboxRoute
    ? "Search emails..."
    : isCalendarRoute
    ? "Search events..."
    : isSettingsRoute
    ? "Search settings..."
    : isResumeGeneratorRoute
    ? "Search profiles, job descriptions..."
    : isResumeTemplatesRoute
    ? "Search templates..."
    : isApplicationsRoute
    ? "Search applications..."
    : isRequestsRoute
    ? "Search requests..."
    : isTalentsRoute
    ? "Search talents..."
    : isAdminRoute
    ? "Search users..."
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

  if (isSettingsRoute) {
    return shell(<SettingsPage />);
  }

  if (isResumeGeneratorRoute) {
    return shell(<ResumeGeneratorPage />);
  }

  if (isResumeTemplatesRoute) {
    return shell(<ResumeTemplatesPage />);
  }

  if (isApplicationsRoute) {
    return shell(<ApplicationsPage />);
  }

  if (isTalentsRoute) {
    return shell(<TalentsPage />);
  }

  if (isRequestsRoute) {
    return shell(<RequestsPage />);
  }

  if (isAdminRoute) {
    return shell(<AdminPage />);
  }

  if (route.startsWith("/landing")) {
    return <LandingPage onNavigate={navigate} />;
  }

  if (isDashboardRoute) {
    return shell(<DashboardPage />);
  }

  return shell(<DashboardPage />);
};

export default App;
