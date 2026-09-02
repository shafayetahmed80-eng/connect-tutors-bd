import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicSidebarTabs() {
  return <AdminDynamicSectionPage
    title="Sidebar Tabs"
  >
    <SiteContentEditor page="sidebar-tabs" />
  </AdminDynamicSectionPage>;
}
