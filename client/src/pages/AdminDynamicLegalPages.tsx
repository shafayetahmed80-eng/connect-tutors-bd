import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import PolicyDocumentEditor from "@/components/PolicyDocumentEditor";

export default function AdminDynamicLegalPages() {
  return <AdminDynamicSectionPage
    title="Legal pages"
    heading="Legal pages"
    description="Write the Terms of Use and the Privacy Policy that a Guardian and a Tutor accept when they register. The preview beside the editor is the page itself, so what you see there is what a visitor reads."
  >
    <PolicyDocumentEditor />
  </AdminDynamicSectionPage>;
}
