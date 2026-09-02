import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicSidebarTabs() {
  return <AdminDynamicSectionPage
    title="Sidebar Tabs"
    heading="Sidebar Tabs"
    description="Rename the menu items and group headings in each panel’s sidebar, and set their text size and row padding in pixels."
  >
    <SiteContentEditor page="sidebar-tabs" />
  </AdminDynamicSectionPage>;
}
