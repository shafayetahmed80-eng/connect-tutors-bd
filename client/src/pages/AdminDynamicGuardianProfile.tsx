import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicGuardianProfile() {
  return <AdminDynamicSectionPage
    title="Guardian Profile content"
    heading="Guardian Profile"
    description="Edit the copy on the Guardian dashboard profile and the public Request a tutor journey. Saving publishes immediately; Reset restores the original wording."
  >
    <SiteContentEditor page="guardian-profile" />
  </AdminDynamicSectionPage>;
}
