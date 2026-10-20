import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import SiteContentEditor from "@/components/SiteContentEditor";
import HomeHeroTypographySuite from "@/components/HomeHeroTypographySuite";

export default function AdminDynamicHome() {
  return (
    <AdminDynamicSectionPage title="Home page">
      <div className="space-y-8">
        <HomeHeroTypographySuite />
        <div className="border-t border-j-border pt-6">
          <h2 className="mb-4 text-base font-bold text-j-ink">
            হোমপেইজের অন্যান্য সেকশন কনটেন্ট এডিটর
          </h2>
          <SiteContentEditor page="home" />
        </div>
      </div>
    </AdminDynamicSectionPage>
  );
}
