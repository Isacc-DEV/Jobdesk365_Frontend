import { useEffect } from "react";
import {
  detectSectionFromPath,
  getCanonicalSectionPath,
  isTalentsRoute
} from "../../lib/sectionRoutes";
import UsersApplicationsPage from "./ApplicationsPage";
import UsersCalendarPage from "./CalendarPage";
import UsersChatPage from "./ChatPage";
import UsersDashboardPage from "./DashboardPage";
import UsersInboxPage from "./InboxPage";
import UsersProfilesPage from "./ProfilesPage";
import UsersRequestsPage from "./RequestsPage";
import UsersResumeGeneratorPage from "./ResumeGeneratorPage";
import UsersResumeTemplatesPage from "./ResumeTemplatesPage";
import UsersSettingsPage from "./SettingsPage";
import UsersTalentsPage from "./TalentsPage";
import UsersUserProfilePage from "./UserProfilePage";

type UsersRoutesProps = {
  route: string;
  userLoading: boolean;
  navigate: (path: string) => void;
};

const RouteStatus = ({ message }: { message: string }) => (
  <div className="min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
    <p className="text-ink-muted">{message}</p>
  </div>
);

const UsersRoutes = ({ route, userLoading, navigate }: UsersRoutesProps) => {
  const section = detectSectionFromPath(route);
  const canonicalSectionPath = getCanonicalSectionPath(route, "user");

  useEffect(() => {
    if (userLoading || !canonicalSectionPath) return;
    if (route.startsWith(canonicalSectionPath)) return;
    navigate(canonicalSectionPath);
  }, [canonicalSectionPath, navigate, route, userLoading]);

  if (section && userLoading) {
    return <RouteStatus message="Checking access..." />;
  }

  if (section && canonicalSectionPath && !route.startsWith(canonicalSectionPath)) {
    return <RouteStatus message="Redirecting..." />;
  }

  if (section === "profiles") return <UsersProfilesPage />;
  if (section === "applications") return <UsersApplicationsPage />;
  if (section === "inbox") return <UsersInboxPage />;
  if (section === "calendar") return <UsersCalendarPage />;
  if (section === "requests") return <UsersRequestsPage />;

  if (route.startsWith("/user")) return <UsersUserProfilePage />;
  if (route.startsWith("/settings")) return <UsersSettingsPage />;
  if (route.startsWith("/resume-generator")) return <UsersResumeGeneratorPage />;
  if (route.startsWith("/resume-templates")) return <UsersResumeTemplatesPage />;
  if (isTalentsRoute(route)) return <UsersTalentsPage />;
  if (route.startsWith("/chat")) return <UsersChatPage />;
  if (route === "/dashboard") return <UsersDashboardPage />;

  return <UsersDashboardPage />;
};

export default UsersRoutes;

