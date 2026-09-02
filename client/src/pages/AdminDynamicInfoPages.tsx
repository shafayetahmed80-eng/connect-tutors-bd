import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicInfoPages() {
  return <AdminDynamicSectionPage
    title="Public pages"
    heading="Public pages"
    description="Edit the heading and description on each informational page behind the header links."
  >
    <SiteContentEditor page="info-pages" />
  </AdminDynamicSectionPage>;
}
