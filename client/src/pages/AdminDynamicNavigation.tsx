import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteLimitEditor from "@/components/SiteLimitEditor";

/**
 * Corner rounding for the pieces of the dashboard shell that are neither a
 * dialog (Modals) nor an input box (Input Field Text): the sidebar's own
 * highlighted row, the Tutor Profile's own tab bar and the differently-shaped
 * Guardian/Admin profile tab bar, and every section or group card.
 */
export default function AdminDynamicNavigation() {
  return <AdminDynamicSectionPage
    title="Navigation & Sections"
  >
    <SiteLimitEditor groups={["Navigation"]} />
  </AdminDynamicSectionPage>;
}
