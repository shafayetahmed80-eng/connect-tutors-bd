import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteLimitEditor from "@/components/SiteLimitEditor";

/**
 * The lettering of a job card and of the dialog it opens. The same card is the
 * Job Board's, the Admin's Posted jobs and the Guardian's Posted jobs, so one
 * number moves all three; the dialog it opens has its own.
 */
export default function AdminDynamicJobCard() {
  return <AdminDynamicSectionPage
    title="Job card"
  >
    <SiteLimitEditor groups={["Job card"]} />
  </AdminDynamicSectionPage>;
}
