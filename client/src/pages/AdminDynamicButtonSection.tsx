import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";
import SiteLimitEditor from "@/components/SiteLimitEditor";

/**
 * Two different mechanisms on one screen because an Owner thinks of a button
 * as one thing, not two settings tables. Size (text, height, padding) is a
 * systematic number applied to every button in one of the two vocabularies at
 * once, so it lives with Modals and Input Field Text in site_limits. A
 * button's word is copy, one string at a time, so it goes through the same
 * text-override mechanism as every other editable heading on the site.
 */
export default function AdminDynamicButtonSection() {
  return <AdminDynamicSectionPage
    title="Button Section"
  >
    <SiteLimitEditor groups={["Button Section"]} />
    <h2 className="pt-2 text-sm font-bold text-j-ink">Button text</h2>
    <SiteContentEditor page="button-section" />
  </AdminDynamicSectionPage>;
}
