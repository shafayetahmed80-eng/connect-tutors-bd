import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { defaultSeoPage, seoTitleFor } from "@shared/seo";

/**
 * Keeps the browser tab's title in step with the page. Moving around the site
 * without a reload always changes it. The page someone lands on already has its
 * own title in the HTML (the server puts it there, and a shared Job Board link's
 * title is the tuition's), so that one is only touched when what arrived is the
 * site-wide title - which is what an installed app's saved copy of the page has.
 */
export default function SeoManager() {
  const [location] = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const landing = first.current;
    first.current = false;
    if (landing && document.title !== defaultSeoPage.title) return;
    document.title = seoTitleFor(location);
  }, [location]);
  return null;
}
