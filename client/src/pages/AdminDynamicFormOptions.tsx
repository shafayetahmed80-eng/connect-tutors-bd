import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import OptionCatalogManager from "@/components/OptionCatalogManager";

export default function AdminDynamicFormOptions() {
  return <AdminDynamicSectionPage
    title="Form options"
    heading="Form options"
    description="Edit the dropdown lists the Tutor and Request-a-tutor forms are built from. Changes take effect on the next form load, with no deploy."
  >
    <OptionCatalogManager />
  </AdminDynamicSectionPage>;
}
