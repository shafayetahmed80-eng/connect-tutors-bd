import { useEffect, useState } from "react";

const STORAGE_KEY = "ct_is_android_app";

/**
 * Returns true if the user is running Connect Tutors inside an installed
 * Progressive Web App / Trusted Web Activity (TWA) Android application,
 * rather than a standard web browser tab.
 */
export function useIsApp(): boolean {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check local storage cache
    if (window.localStorage && window.localStorage.getItem(STORAGE_KEY) === "true") {
      setIsApp(true);
      return;
    }

    // 2. Check query parameter on app launch (e.g. ?platform=android_app)
    const params = new URLSearchParams(window.location.search);
    if (params.get("platform") === "android_app") {
      try {
        window.localStorage?.setItem(STORAGE_KEY, "true");
      } catch {
        /* ignore storage write failures */
      }
      setIsApp(true);
      return;
    }

    // 3. Check Android OS referrer
    if (document.referrer && document.referrer.includes("android-app://")) {
      try {
        window.localStorage?.setItem(STORAGE_KEY, "true");
      } catch {
        /* ignore storage write failures */
      }
      setIsApp(true);
      return;
    }

    // 4. Check display-mode media queries
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true;

    if (isStandalone) {
      try {
        window.localStorage?.setItem(STORAGE_KEY, "true");
      } catch {
        /* ignore storage write failures */
      }
      setIsApp(true);
    }
  }, []);

  return isApp;
}
