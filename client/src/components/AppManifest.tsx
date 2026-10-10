import { useEffect } from "react";
import { useLocation } from "wouter";
import { appManifestKindFor, applyAppManifest } from "@/lib/appManifest";

/** Keeps the page's manifest the Admin app's on Admin pages and the site's everywhere else. Draws nothing. */
export default function AppManifest() {
  const [location] = useLocation();
  useEffect(() => {
    applyAppManifest(document, appManifestKindFor(location));
  }, [location]);
  return null;
}
