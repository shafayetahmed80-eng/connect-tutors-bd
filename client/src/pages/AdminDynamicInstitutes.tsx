import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import LargeCatalogManager from "@/components/LargeCatalogManager";

export default function AdminDynamicInstitutes() {
  return <AdminDynamicSectionPage
    title="Institutes & departments"
    heading="Institutes & departments"
    description="Search, rename, hide or add the institutes and the department / subject list a Tutor picks from. These are searched a page at a time because each holds hundreds of rows."
  >
    <LargeCatalogManager />
  </AdminDynamicSectionPage>;
}
