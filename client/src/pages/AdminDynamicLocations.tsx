import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import LocationCatalogManager from "@/components/LocationCatalogManager";

export default function AdminDynamicLocations() {
  return <AdminDynamicSectionPage
    title="Cities & locations"
  >
    <LocationCatalogManager />
  </AdminDynamicSectionPage>;
}
