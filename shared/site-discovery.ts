/**
 * What a search engine is told about the site: which pages to list, and which
 * to leave alone. `/blogs` and `/events` are left out of the list on purpose -
 * they only say more is coming, and a thin page does the site no good.
 */
export const sitemapPaths = [
  "/",
  "/job-board",
  "/request-tutor",
  "/become-tutor",
  "/tuition",
  "/contact",
  "/privacy-policy",
  "/terms-conditions",
] as const;

/** A path here, or anything beneath it, is private: sign-in, panels, reset links, letter checks, files and the API. */
export const robotsDisallowedPaths = [
  "/admin",
  "/guardian/",
  "/tutor/",
  "/auth",
  "/login",
  "/account",
  "/forgot-password",
  "/reset-password/",
  "/verify",
  "/api/",
  "/manus-storage/",
] as const;

/** `www.` and the bare domain are the same site. */
function bareHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

/** Whether the request came in on the address the Owner published the site at. */
export function isCanonicalHost(requestHost: string | undefined, publicSiteUrl: string) {
  if (!requestHost) return false;
  try {
    return bareHost(requestHost) === bareHost(new URL(publicSiteUrl).hostname);
  } catch {
    return false;
  }
}

/** Anywhere but the published address (staging, a laptop) is closed to search engines entirely. */
export function buildRobotsTxt(publicSiteUrl: string, canonical: boolean) {
  if (!canonical) return "User-agent: *\nDisallow: /\n";
  return [
    "User-agent: *",
    ...robotsDisallowedPaths.map(path => `Disallow: ${path}`),
    "",
    `Sitemap: ${publicSiteUrl}/sitemap.xml`,
    "",
  ].join("\n");
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function buildSitemapXml(publicSiteUrl: string) {
  const urls = sitemapPaths.map(path => `  <url><loc>${escapeXml(`${publicSiteUrl}${path}`)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/**
 * Android Digital Asset Links (TWA) configuration for Connect Tutors Android App.
 * Establishes cryptographic verification between the domain and the Android app
 * to remove the browser address bar for a 100% full-screen native experience.
 */
export const defaultAndroidAppConfig = {
  packageName: "com.connecttutorsbd.app",
  sha256Fingerprints: [
    "F9:6B:4A:18:4D:49:AE:51:91:7D:4C:4E:4D:26:3A:2B:36:4C:C5:3F:60:98:54:50:E3:11:8A:85:3E:03:E6:2D",
  ],
};

export function buildAssetLinksJson(fingerprints: string[] = defaultAndroidAppConfig.sha256Fingerprints) {
  return JSON.stringify(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: defaultAndroidAppConfig.packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    null,
    2
  );
}

