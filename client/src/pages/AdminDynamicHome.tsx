import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicHome() {
  return <AdminDynamicSectionPage
    title="Home page"
    heading="Home page"
    description="Edit the copy a visitor sees first — the hero, the tuition cards, the steps, the questions, and the closing call to action."
  >
    <SiteContentEditor page="home" />
  </AdminDynamicSectionPage>;
}
