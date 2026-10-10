// Regenerates the Admin app's icons in client/public from the Admin mark (the brand
// mark on a deep navy tile, so the two apps are easy to tell apart on a home screen):
//   pnpm exec pwa-assets-generator --config pwa-assets-admin.config.ts
// Same sizes as the site's icons (pwa-assets.config.ts), named admin-*, and no favicon.
import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

const onTileNavy = { padding: 0.15, resizeOptions: { background: "#0B2545" } };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, favicons: [] },
    maskable: { ...minimal2023Preset.maskable, ...onTileNavy },
    apple: { ...minimal2023Preset.apple, ...onTileNavy },
    assetName: (type, size) => {
      const prefix = type === "transparent" ? "admin-pwa" : type === "maskable" ? "admin-maskable-icon" : "admin-apple-touch-icon";
      return `${prefix}-${size.width}x${size.height}.png`;
    },
  },
  images: ["client/public/pwa-icon-admin-source.svg"],
});
