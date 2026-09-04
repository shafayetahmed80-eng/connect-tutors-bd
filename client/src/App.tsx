/**
 * Connect Tutors BD visual direction: Neighbourhood Learning Blue — routes share one calm branded system,
 * bringing every user journey back to an easy, visible next step.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import {
  clearCurrentTutorPortalToken,
  clearCurrentTutorPortalLoginHandoff,
  getCurrentTutorPortalToken,
  isCurrentTutorPortalLoginHandoffActive,
  shouldDeferTutorPortalPublicExitForLoginHandoff,
  shouldEndTutorPortalSessionForLocation,
} from "./lib/tutorPortalSession";
import Home from "./pages/Home";
import AuthPage from "./pages/Auth";
import InfoPage from "./pages/InfoPage";
import JoinTutor from "./pages/JoinTutor";
import NotFound from "./pages/NotFound";
import TutorRequest from "./pages/TutorRequest";
import GuardianRequestJourney from "./pages/GuardianRequestJourney";
import TutorListing from "./pages/TutorListing";
import TutorProfile from "./pages/TutorProfile";
import AccountPage from "./pages/Account";
import TutorDashboard from "./pages/TutorDashboard";
import TutorLogin from "./pages/TutorLogin";
import GuardianRequestTracking from "./pages/GuardianRequestTracking";
import AdminMatchingWorkspace from "./pages/AdminMatchingWorkspace";
import AdminHelp from "./pages/AdminHelp";
import AdminLogin from "./pages/AdminLogin";
import AdminSecurityWorkspace from "./pages/AdminSecurityWorkspace";
import AdminCredentialSetup from "./pages/AdminCredentialSetup";
import AdminInvitationAccept from "./pages/AdminInvitationAccept";
import AdminMonitoringOverview from "./pages/AdminMonitoringOverview";
import AdminTutorManagement from "./pages/AdminTutorManagement";
import { SiteContentProvider } from "@/lib/siteContent";
import AdminDynamicTutorProfile from "./pages/AdminDynamicTutorProfile";
import AdminDynamicGuardianProfile from "./pages/AdminDynamicGuardianProfile";
import AdminDynamicFormOptions from "./pages/AdminDynamicFormOptions";
import AdminDynamicSidebarTabs from "./pages/AdminDynamicSidebarTabs";
import AdminDynamicHome from "./pages/AdminDynamicHome";
import AdminDynamicInfoPages from "./pages/AdminDynamicInfoPages";
import AdminDynamicInstitutes from "./pages/AdminDynamicInstitutes";
import AdminDynamicLocations from "./pages/AdminDynamicLocations";
import AdminDynamicLegalPages from "./pages/AdminDynamicLegalPages";
import AdminDynamicLimits from "./pages/AdminDynamicLimits";
import AdminDynamicModals from "@/pages/AdminDynamicModals";
import AdminDynamicInputFieldText from "@/pages/AdminDynamicInputFieldText";
import { SiteDimensionStyle } from "@/components/SiteDimensionStyle";
import AdminGuardianActivity from "./pages/AdminGuardianActivity";
import AdminActivityReport from "./pages/AdminActivityReport";
import GuardianDashboard from "./pages/GuardianDashboard";
import JobBoard from "./pages/JobBoard";

function TutorPortalPublicExitCoordinator() {
  const [location] = useLocation();
  const endTutorPortalSession = trpc.auth.endTutorPortalSession.useMutation();

  useEffect(() => {
    const tutorPortalToken = getCurrentTutorPortalToken();
    if (location.startsWith("/tutor/dashboard")) {
      clearCurrentTutorPortalLoginHandoff();
      return;
    }
    if (shouldDeferTutorPortalPublicExitForLoginHandoff(location, isCurrentTutorPortalLoginHandoffActive())) return;
    if (!tutorPortalToken || !shouldEndTutorPortalSessionForLocation(location, tutorPortalToken)) return;

    clearCurrentTutorPortalLoginHandoff();
    clearCurrentTutorPortalToken();
    void endTutorPortalSession.mutateAsync({ tutorPortalToken }).catch(() => undefined);
  }, [endTutorPortalSession, location]);

  return null;
}

function Router() {
  return <><SiteDimensionStyle /><TutorPortalPublicExitCoordinator /><Switch><Route path="/" component={Home} /><Route path="/auth" component={AuthPage} /><Route path="/login" component={AuthPage} /><Route path="/job-board" component={JobBoard} /><Route path="/admin/help" component={AdminHelp} /><Route path="/admin/login" component={AdminLogin} /><Route path="/admin/credential-setup" component={AdminCredentialSetup} /><Route path="/admin/dashboard" component={AdminMonitoringOverview} /><Route path="/admin/tutors" component={AdminTutorManagement} /><Route path="/admin/guardians" component={AdminGuardianActivity} /><Route path="/admin/reports" component={AdminActivityReport} /><Route path="/admin/security" component={AdminSecurityWorkspace} /><Route path="/admin/dynamic/tutor-profile" component={AdminDynamicTutorProfile} /><Route path="/admin/dynamic/guardian-profile" component={AdminDynamicGuardianProfile} /><Route path="/admin/dynamic/form-options" component={AdminDynamicFormOptions} /><Route path="/admin/dynamic/sidebar-tabs" component={AdminDynamicSidebarTabs} /><Route path="/admin/dynamic/home" component={AdminDynamicHome} /><Route path="/admin/dynamic/public-pages" component={AdminDynamicInfoPages} /><Route path="/admin/dynamic/institutes" component={AdminDynamicInstitutes} /><Route path="/admin/dynamic/locations" component={AdminDynamicLocations} /><Route path="/admin/dynamic/legal-pages" component={AdminDynamicLegalPages} /><Route path="/admin/dynamic/limits" component={AdminDynamicLimits} /><Route path="/admin/dynamic/modals" component={AdminDynamicModals} /><Route path="/admin/dynamic/input-field-text" component={AdminDynamicInputFieldText} /><Route path="/admin/2fa-setup" component={() => <Redirect to="/admin/login" />} /><Route path="/admin/2fa-challenge" component={() => <Redirect to="/admin/login" />} /><Route path="/admin/invitation/:token" component={AdminInvitationAccept} /><Route path="/tutor/login" component={TutorLogin} /><Route path="/register" component={AuthPage} /><Route path="/account" component={AccountPage} /><Route path="/admin/matching" component={AdminMatchingWorkspace} /><Route path="/guardian/dashboard/:section/:requestId" component={GuardianDashboard} /><Route path="/guardian/dashboard/:section" component={GuardianDashboard} /><Route path="/guardian/dashboard" component={GuardianDashboard} /><Route path="/guardian/requests" component={GuardianRequestTracking} /><Route path="/tutor/dashboard" component={TutorDashboard} /><Route path="/tutor/dashboard/:section" component={TutorDashboard} /><Route path="/submit-requirement" component={TutorRequest} /><Route path="/request-tutor" component={() => <GuardianRequestJourney />} /><Route path="/terms" component={() => <Redirect to="/terms-conditions" />} /><Route path="/privacy" component={() => <Redirect to="/privacy-policy" />} /><Route path="/become-tutor" component={JoinTutor} /><Route path="/join-tutor" component={JoinTutor} /><Route path="/tuition" component={InfoPage} /><Route path="/tutors" component={TutorListing} /><Route path="/tutors/:id" component={TutorProfile} /><Route path="/blogs" component={InfoPage} /><Route path="/events" component={InfoPage} /><Route path="/contact" component={InfoPage} /><Route path="/privacy-policy" component={InfoPage} /><Route path="/terms-conditions" component={InfoPage} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></>;
}

export default function App() {
  // Site-wide slots (the support number) are needed by the header and footer on
  // every route, so the provider sits above the router. Page-level providers
  // nest inside it and merge, rather than replacing it.
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><SiteContentProvider page="site"><Toaster position="top-center" /><Router /></SiteContentProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
