import { useEffect } from "react";
import {
  detectSectionFromPath,
  getCanonicalSectionPath,
  isTalentsRoute
} from "../../lib/sectionRoutes";
import ManagersApplicationsPage from "./ApplicationsPage";
import ManagersCalendarPage from "./CalendarPage";
import ManagersChatPage from "./ChatPage";
import ManagersDashboardPage from "./DashboardPage";
import ManagersInboxPage from "./InboxPage";
import ManagersProfilesPage from "./ProfilesPage";
import ManagersRequestsPage from "./RequestsPage";
import ManagersResumeGeneratorPage from "./ResumeGeneratorPage";
import ManagersResumeTemplatesPage from "./ResumeTemplatesPage";
import ManagersSettingsPage from "./SettingsPage";
import ManagersTalentsPage from "./TalentsPage";
import ManagersUserProfilePage from "./UserProfilePage";

type ManagersRoutesProps = {
  route: string;
  userLoading: boolean;
  navigate: (path: string) => void;
};

const RouteStatus = ({ message }: { message: string }) => (
  <div className="min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
    <p className="text-ink-muted">{message}</p>
  </div>
);

const ManagersRoutes = ({ route, userLoading, navigate }: ManagersRoutesProps) => {
  const section = detectSectionFromPath(route);
  const canonicalSectionPath = getCanonicalSectionPath(route, "manager");

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

  if (section === "profiles") return <ManagersProfilesPage />;
  if (section === "applications") return <ManagersApplicationsPage />;
  if (section === "inbox") return <ManagersInboxPage />;
  if (section === "calendar") return <ManagersCalendarPage />;
  if (section === "requests") return <ManagersRequestsPage />;

  if (route.startsWith("/user")) return <ManagersUserProfilePage />;
  if (route.startsWith("/settings")) return <ManagersSettingsPage />;
  if (route.startsWith("/resume-generator")) return <ManagersResumeGeneratorPage />;
  if (route.startsWith("/resume-templates")) return <ManagersResumeTemplatesPage />;
  if (isTalentsRoute(route)) return <ManagersTalentsPage />;
  if (route.startsWith("/chat")) return <ManagersChatPage />;
  if (route === "/dashboard") return <ManagersDashboardPage />;

  return <ManagersDashboardPage />;
};

export default ManagersRoutes;

