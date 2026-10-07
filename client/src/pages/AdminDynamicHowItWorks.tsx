import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicHowItWorks() {
  return <AdminDynamicSectionPage
    title="How it works"
  >
    <SiteContentEditor page="how-it-works" />
  </AdminDynamicSectionPage>;
}
