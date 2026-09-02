import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteLimitEditor from "@/components/SiteLimitEditor";

export default function AdminDynamicLimits() {
  return <AdminDynamicSectionPage
    title="Limits"
  >
    <SiteLimitEditor />
  </AdminDynamicSectionPage>;
}
