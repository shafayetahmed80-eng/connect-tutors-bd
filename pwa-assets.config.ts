// Regenerates the favicon and app icons in client/public from the brand mark:
//   pnpm exec pwa-assets-generator
// The maskable and Apple icons are padded onto the tile's own blue, so they
// fill edge to edge instead of showing a rounded tile on white. At 0.15 the
// cradle still sits inside the maskable safe circle (80% of the icon).
import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

const onTileBlue = { padding: 0.15, resizeOptions: { background: "#0B5FA8" } };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...onTileBlue },
    apple: { ...minimal2023Preset.apple, ...onTileBlue },
  },
  images: ["client/public/pwa-icon-source.svg"],
});
