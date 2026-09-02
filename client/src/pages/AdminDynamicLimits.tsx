import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteLimitEditor from "@/components/SiteLimitEditor";

export default function AdminDynamicLimits() {
  return <AdminDynamicSectionPage
    title="Limits"
    heading="Limits"
    description="How many subjects a request may name, how long a job stays on the board, how large an upload may be. These were fixed numbers in the code; each now shows the range it may move between."
  >
    <SiteLimitEditor />
  </AdminDynamicSectionPage>;
}
