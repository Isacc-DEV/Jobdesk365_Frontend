import { useCallback, useEffect, useState } from "react";
import Header from "./components/layout/Header";
import MainPlaceholder from "./components/layout/MainPlaceholder";
import Sidebar from "./components/layout/Sidebar";
import AuthPage from "./components/auth/AuthPage";
import UserProfilePage from "./components/user/UserProfilePage";
import { useAuthGuard } from "./hooks/useAuthGuard";
import { useUser } from "./hooks/useUser";
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
import ChatPage from "./components/chat/ChatPage";
import LiveChatCard from "./components/chat/LiveChatCard";
import {
  getApplicationsRouteByRoles,
  getCalendarRouteByRoles,
  getInboxRouteByRoles,
  getProfilesRouteByRoles,
  getRequestsRouteByRoles
} from "./lib/profilesAccess";

const App = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarWidth = sidebarExpanded ? 240 : 72;
  const initialPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const [route, setRoute] = useState(initialPath);

  const navigate = useCallback((path) => {
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
  const isUserRoute = route.startsWith("/user");

  const isAdminProfilesRoute = route.startsWith("/admin/profiles");
  const isManagerProfilesRoute = route.startsWith("/manager/profiles");
  const isProfilesRoute = route.startsWith("/profiles") || isManagerProfilesRoute || isAdminProfilesRoute;

  const isAdminApplicationsRoute = route.startsWith("/admin/applications");
  const isManagerApplicationsRoute = route.startsWith("/manager/applications");
  const isApplicationsRoute =
    route.startsWith("/applications") || isManagerApplicationsRoute || isAdminApplicationsRoute;

  const isAdminInboxRoute = route.startsWith("/admin/inbox");
  const isManagerInboxRoute = route.startsWith("/manager/inbox");
  const isInboxRoute = route.startsWith("/inbox") || isManagerInboxRoute || isAdminInboxRoute;

  const isAdminCalendarRoute = route.startsWith("/admin/calendar");
  const isManagerCalendarRoute = route.startsWith("/manager/calendar");
  const isCalendarRoute = route.startsWith("/calendar") || isManagerCalendarRoute || isAdminCalendarRoute;

  const isSettingsRoute = route.startsWith("/settings");
  const isResumeGeneratorRoute = route.startsWith("/resume-generator");
  const isResumeTemplatesRoute = route.startsWith("/resume-templates");
  const isTalentsRoute = route.startsWith("/hire-talents") || route.startsWith("/hire-talent");

  const isAdminRequestsRoute = route.startsWith("/admin/requests");
  const isManagerRequestsRoute = route.startsWith("/manager/requests");
  const isLegacyHireRequestsRoute = route.startsWith("/hire") && !isTalentsRoute;
  const isRequestsRoute =
    route.startsWith("/requests") ||
    isManagerRequestsRoute ||
    isAdminRequestsRoute ||
    isLegacyHireRequestsRoute;

  const isAdminScopedSectionRoute =
    isAdminProfilesRoute ||
    isAdminApplicationsRoute ||
    isAdminInboxRoute ||
    isAdminCalendarRoute ||
    isAdminRequestsRoute;

  const isAdminRoute = route.startsWith("/admin") && !isAdminScopedSectionRoute;
  const isChatRoute = route.startsWith("/chat");
  const isDashboardRoute = route === "/dashboard";

  const { isAuthed, authChecked } = useAuthGuard();
  const { user, loading: userLoading } = useUser({ enabled: isAuthed, redirectOnUnauthorized: false });
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const profilesRoute = getProfilesRouteByRoles(roles);
  const applicationsRoute = getApplicationsRouteByRoles(roles);
  const inboxRoute = getInboxRouteByRoles(roles);
  const calendarRoute = getCalendarRouteByRoles(roles);
  const requestsRoute = getRequestsRouteByRoles(roles);
  const isEmployee = roles.some((role) => role === "admin" || role === "manager" || role === "worker");
  const showLiveChat = !isAuthed || (!userLoading && !isEmployee);

  useEffect(() => {
    if (!isAuthed || userLoading) return;
    if (isProfilesRoute && !route.startsWith(profilesRoute)) {
      navigate(profilesRoute);
      return;
    }
    if (isApplicationsRoute && !route.startsWith(applicationsRoute)) {
      navigate(applicationsRoute);
      return;
    }
    if (isInboxRoute && !route.startsWith(inboxRoute)) {
      navigate(inboxRoute);
      return;
    }
    if (isCalendarRoute && !route.startsWith(calendarRoute)) {
      navigate(calendarRoute);
      return;
    }
    if (isLegacyHireRequestsRoute || (isRequestsRoute && !route.startsWith(requestsRoute))) {
      navigate(requestsRoute);
    }
  }, [
    applicationsRoute,
    calendarRoute,
    inboxRoute,
    isAuthed,
    isApplicationsRoute,
    isCalendarRoute,
    isInboxRoute,
    isLegacyHireRequestsRoute,
    isProfilesRoute,
    isRequestsRoute,
    navigate,
    profilesRoute,
    requestsRoute,
    route,
    userLoading
  ]);

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
    : isChatRoute
    ? "Search threads..."
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
      {showLiveChat ? <LiveChatCard /> : null}
    </div>
  );

  if (isUserRoute) {
    return shell(<UserProfilePage />);
  }

  if ((isProfilesRoute || isApplicationsRoute || isInboxRoute || isCalendarRoute || isRequestsRoute) && userLoading) {
    return shell(
      <div className="min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
        <p className="text-ink-muted">Checking access...</p>
      </div>
    );
  }

  if (isProfilesRoute) {
    if (!route.startsWith(profilesRoute)) {
      return shell(
        <div className="min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
          <p className="text-ink-muted">Redirecting...</p>
        </div>
      );
    }
    if (route.startsWith("/admin/profiles")) {
      return shell(<MainPlaceholder profileMode="admin" />);
    }
    if (route.startsWith("/manager/profiles")) {
      return shell(<MainPlaceholder profileMode="manager" />);
    }
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

  if (isChatRoute) {
    return shell(<ChatPage />);
  }

  if (isDashboardRoute) {
    return shell(<DashboardPage />);
  }

  if (isLandingRoute) {
    return (
      <>
        <LandingPage onNavigate={navigate} />
        {showLiveChat ? <LiveChatCard /> : null}
      </>
    );
  }

  return shell(<DashboardPage />);
};

export default App;
