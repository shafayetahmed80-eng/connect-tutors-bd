import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicTutorProfile() {
  return <AdminDynamicSectionPage
    title="Tutor Profile content"
    heading="Tutor Profile"
    description="Edit the headings shown on the Tutor Profile page. Saving publishes immediately; Reset restores the original wording."
  >
    <SiteContentEditor page="tutor-profile" />
  </AdminDynamicSectionPage>;
}
