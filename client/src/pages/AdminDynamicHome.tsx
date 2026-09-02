import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicHome() {
  return <AdminDynamicSectionPage
    title="Home page"
  >
    <SiteContentEditor page="home" />
  </AdminDynamicSectionPage>;
}
