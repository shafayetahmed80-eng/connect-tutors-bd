import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import LocationCatalogManager from "@/components/LocationCatalogManager";

export default function AdminDynamicLocations() {
  return <AdminDynamicSectionPage
    title="Cities & locations"
    heading="Cities & locations"
    description="Open a city to reach the thanas and areas inside it, then rename, hide or add places there. Unlike the other lists these sit inside one another, so a new place is always added somewhere."
  >
    <LocationCatalogManager />
  </AdminDynamicSectionPage>;
}
