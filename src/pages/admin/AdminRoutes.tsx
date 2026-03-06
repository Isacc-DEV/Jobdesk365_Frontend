import { useEffect } from "react";
import {
  detectSectionFromPath,
  getCanonicalSectionPath,
  isAdminRoute,
  isTalentsRoute
} from "../../lib/sectionRoutes";
import AdminAdminPage from "./AdminPage";
import AdminApplicationsPage from "./ApplicationsPage";
import AdminCalendarPage from "./CalendarPage";
import AdminChatPage from "./ChatPage";
import AdminDashboardPage from "./DashboardPage";
import AdminInboxPage from "./InboxPage";
import AdminProfilesPage from "./ProfilesPage";
import AdminRequestsPage from "./RequestsPage";
import AdminResumeGeneratorPage from "./ResumeGeneratorPage";
import AdminResumeTemplatesPage from "./ResumeTemplatesPage";
import AdminSettingsPage from "./SettingsPage";
import AdminTalentsPage from "./TalentsPage";
import AdminUserProfilePage from "./UserProfilePage";
import PaymentReturnPage from "../../components/user/PaymentReturnPage";

type AdminRoutesProps = {
  route: string;
  userLoading: boolean;
  navigate: (path: string) => void;
};

const RouteStatus = ({ message }: { message: string }) => (
  <div className="min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
    <p className="text-ink-muted">{message}</p>
  </div>
);

const AdminRoutes = ({ route, userLoading, navigate }: AdminRoutesProps) => {
  const section = detectSectionFromPath(route);
  const canonicalSectionPath = getCanonicalSectionPath(route, "admin");

  useEffect(() => {
    if (!userLoading && route === "/admin") {
      navigate("/admin/users");
      return;
    }
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

  if (section === "profiles") return <AdminProfilesPage />;
  if (section === "applications") return <AdminApplicationsPage />;
  if (section === "inbox") return <AdminInboxPage />;
  if (section === "calendar") return <AdminCalendarPage />;
  if (section === "requests") return <AdminRequestsPage />;

  if (route.startsWith("/payment-success")) return <PaymentReturnPage />;
  if (route.startsWith("/payment-cancel")) return <PaymentReturnPage />;
  if (route.startsWith("/user")) return <AdminUserProfilePage />;
  if (route.startsWith("/settings")) return <AdminSettingsPage />;
  if (route.startsWith("/resume-generator")) return <AdminResumeGeneratorPage />;
  if (route.startsWith("/resume-templates")) return <AdminResumeTemplatesPage />;
  if (isTalentsRoute(route)) return <AdminTalentsPage />;
  if (route.startsWith("/chat")) return <AdminChatPage />;
  if (route.startsWith("/admin/users")) return <AdminAdminPage />;
  if (isAdminRoute(route)) return <AdminAdminPage />;
  if (route === "/dashboard") return <AdminDashboardPage />;

  return <AdminDashboardPage />;
};

export default AdminRoutes;
