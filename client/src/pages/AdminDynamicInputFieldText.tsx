import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteLimitEditor from "@/components/SiteLimitEditor";

/**
 * The size of the letters typed into a box, and how rounded the box's own
 * corners are - apart from the Modals screen's box heights, since that is
 * layout rather than the field itself.
 */
export default function AdminDynamicInputFieldText() {
  return <AdminDynamicSectionPage
    title="Input Field Text"
  >
    <SiteLimitEditor groups={["Input Field Text"]} />
  </AdminDynamicSectionPage>;
}
