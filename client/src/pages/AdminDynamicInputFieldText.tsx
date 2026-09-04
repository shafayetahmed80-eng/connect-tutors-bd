import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteLimitEditor from "@/components/SiteLimitEditor";

/**
 * The size of the letters typed into a box, apart from the Modals screen's
 * box heights - one is type, the other is layout, and an Owner reaching for
 * one should not have to think about the other.
 */
export default function AdminDynamicInputFieldText() {
  return <AdminDynamicSectionPage
    title="Input Field Text"
  >
    <SiteLimitEditor groups={["Input Field Text"]} />
  </AdminDynamicSectionPage>;
}
