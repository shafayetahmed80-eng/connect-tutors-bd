import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicInfoPages() {
  return <AdminDynamicSectionPage
    title="Public pages"
  >
    <SiteContentEditor page="info-pages" />
  </AdminDynamicSectionPage>;
}
