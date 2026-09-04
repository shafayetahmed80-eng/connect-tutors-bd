import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentBlocks from "@/components/SiteContentBlocks";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicTutorProfile() {
  return <AdminDynamicSectionPage
    title="Tutor Profile content"
  >
    <SiteContentEditor page="tutor-profile" />
    <h2 className="pt-2 text-sm font-bold text-j-ink">Notice blocks</h2>
    <SiteContentBlocks page="tutor-profile" />
  </AdminDynamicSectionPage>;
}
