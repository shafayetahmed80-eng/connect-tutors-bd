import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentBlocks from "@/components/SiteContentBlocks";
import SiteContentEditor from "@/components/SiteContentEditor";

export default function AdminDynamicGuardianProfile() {
  return <AdminDynamicSectionPage
    title="Guardian Profile content"
    heading="Guardian Profile"
    description="Edit the copy on the Guardian dashboard profile and the public Request a tutor journey. Saving publishes immediately; Reset restores the original wording."
  >
    <SiteContentEditor page="guardian-profile" />
    <h2 className="pt-2 text-sm font-bold text-slate-900">Notice blocks</h2>
    <SiteContentBlocks page="guardian-profile" />
  </AdminDynamicSectionPage>;
}
