// Downloads the Image Section's font library from Google Fonts, with each family's
// licence, into client/public/image-fonts/, and writes the file list the studio
// reads (client/src/lib/image-studio-font-files.json).
//
//   node scripts/fetch-image-studio-fonts.mjs [path-to-extra-fonts-folder]
//
// The four Bangla fonts that are not on Google Fonts (SolaimanLipi, Siyam Rupali,
// Ekushey Lohit, Mukti) are copied from the folder given as the argument when it is
// there; their licence texts are written alongside. Re-running replaces everything.

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "client/public/image-fonts";
const LIST = "client/src/lib/image-studio-font-files.json";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** id, Google family query, licence folder in github.com/google/fonts, and the scripts it must cover. */
const GOOGLE = [
  ["noto-sans-bengali", "Noto+Sans+Bengali:wght@400;800", "ofl/notosansbengali", "bn"],
  ["hind-siliguri", "Hind+Siliguri:wght@400;700", "ofl/hindsiliguri", "bn"],
  ["anek-bangla", "Anek+Bangla:wght@400;700", "ofl/anekbangla", "bn"],
  ["baloo-da-2", "Baloo+Da+2:wght@500;800", "ofl/balooda2", "bn"],
  ["mina", "Mina:wght@400;700", "ofl/mina", "bn"],
  ["noto-serif-bengali", "Noto+Serif+Bengali:wght@400;800", "ofl/notoserifbengali", "bn"],
  ["tiro-bangla", "Tiro+Bangla", "ofl/tirobangla", "bn"],
  ["atma", "Atma:wght@500;700", "ofl/atma", "bn"],
  ["galada", "Galada", "ofl/galada", "bn"],
  ["dm-sans", "DM+Sans:wght@400;800", "ofl/dmsans", "en"],
  ["manrope", "Manrope:wght@400;800", "ofl/manrope", "en"],
  ["poppins", "Poppins:wght@400;800", "ofl/poppins", "en"],
  ["montserrat", "Montserrat:wght@400;800", "ofl/montserrat", "en"],
  ["plus-jakarta-sans", "Plus+Jakarta+Sans:wght@400;800", "ofl/plusjakartasans", "en"],
  ["outfit", "Outfit:wght@400;800", "ofl/outfit", "en"],
  ["sora", "Sora:wght@400;800", "ofl/sora", "en"],
  ["playfair-display", "Playfair+Display:wght@400;800", "ofl/playfairdisplay", "en"],
  ["fraunces", "Fraunces:wght@400;800", "ofl/fraunces", "en"],
  ["lora", "Lora:wght@400;700", "ofl/lora", "en"],
  ["bebas-neue", "Bebas+Neue", "ofl/bebasneue", "en"],
  ["archivo-black", "Archivo+Black", "ofl/archivoblack", "en"],
  ["unbounded", "Unbounded:wght@400;800", "ofl/unbounded", "en"],
  ["syne", "Syne:wght@400;800", "ofl/syne", "en"],
  ["righteous", "Righteous", "ofl/righteous", "en"],
  ["fredoka", "Fredoka:wght@400;700", "ofl/fredoka", "en"],
  ["comfortaa", "Comfortaa:wght@400;700", "ofl/comfortaa", "en"],
  ["lexend", "Lexend:wght@400;800", "ofl/lexend", "en"],
  ["urbanist", "Urbanist:wght@400;800", "ofl/urbanist", "en"],
  ["krona-one", "Krona+One", "ofl/kronaone", "en"],
  ["josefin-sans", "Josefin+Sans:wght@400;700", "ofl/josefinsans", "en"],
  ["abril-fatface", "Abril+Fatface", "ofl/abrilfatface", "en"],
  ["dm-serif-display", "DM+Serif+Display", "ofl/dmserifdisplay", "en"],
  ["yeseva-one", "Yeseva+One", "ofl/yesevaone", "en"],
  ["cormorant-garamond", "Cormorant+Garamond:wght@500;700", "ofl/cormorantgaramond", "en"],
  ["alfa-slab-one", "Alfa+Slab+One", "ofl/alfaslabone", "en"],
  ["bungee", "Bungee", "ofl/bungee", "en"],
  ["pacifico", "Pacifico", "ofl/pacifico", "en"],
  ["caveat", "Caveat:wght@500;700", "ofl/caveat", "en"],
  ["kalam", "Kalam:wght@400;700", "ofl/kalam", "en"],
];

/** Only the characters a poster here needs: English, plus Bengali for the Bangla faces. */
const SUBSETS = { bn: new Set(["bengali", "latin"]), en: new Set(["latin", "latin-ext"]) };

/** Fonts that are not on Google Fonts: file in the extras folder, the SPDX licence it carries and its notice (read from the font's own name table). */
const EXTRA = [
  ["solaimanlipi", "SolaimanLipi.woff", 400, "OFL-1.0", "SolaimanLipi. This Font Software is licensed under the SIL Open Font License, Version 1.0."],
  ["siyam-rupali", "SiyamRupali.ttf", 400, "GPL-3.0-only", "Siyam Rupali 1.070. Altered & Hinted by Md. Tanbin Islam Siyam, font programming by M. M. Rifat-Un-Nabi, developed under the Avro Font Development Project (https://github.com/potasiyam/Siyam-Rupali). Free software under the GNU General Public License, version 2 or later; GPL 3.0 per the project README."],
  ["ekushey-lohit", "EkusheyLohit.woff", 400, "OFL-1.0", "Ekushey Lohit 2.0.1. Glyphs from \"Lohit Bengali\" by Automatic Control Equipments, Pune, adapted to Unicode by the contributors of www.ekushey.org; hinting by Alamgir Mohammed and Ershadul Haq. This Font Software is licensed under the SIL Open Font License."],
  ["mukti", "Mukti.woff", 400, "GPL-2.0-only", "Mukti 1.99. GNU GPL (c) Mukta Bangla Font Project 2003-6. As a special exception, if you create a document which uses this font, and embed this font or unaltered portions of this font into the document, this font does not by itself cause the resulting document to be covered by the GNU General Public License."],
];

async function get(url, as = "text") {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return as === "text" ? response.text() : Buffer.from(await response.arrayBuffer());
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const list = {};
let bytes = 0;

for (const [id, query, licenceDir, script] of GOOGLE) {
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const css = await get(`https://fonts.googleapis.com/css2?family=${query}&display=swap`);
  const files = [];
  for (const raw of css.split(/\/\* (?=[a-z-]+ \*\/)/).slice(1)) {
    const subset = raw.slice(0, raw.indexOf(" */")).trim();
    if (!SUBSETS[script].has(subset)) continue;
    const weight = Number(raw.match(/font-weight: (\d+)/)[1]);
    const url = raw.match(/url\((https:[^)]+)\)/)[1];
    const range = raw.match(/unicode-range: ([^;]+);/)?.[1].trim();
    const file = `${id}-${weight}-${subset}.woff2`;
    const data = await get(url, "buffer");
    writeFileSync(join(dir, file), data);
    bytes += data.length;
    files.push({ weight, url: `/image-fonts/${id}/${file}`, ...(range ? { unicodeRange: range } : {}) });
  }
  if (files.length === 0) throw new Error(`no files kept for ${id}`);
  writeFileSync(join(dir, "OFL.txt"), await get(`https://raw.githubusercontent.com/google/fonts/main/${licenceDir}/OFL.txt`));
  list[id] = files;
  console.log(`${id}: ${files.length} files`);
}

const extras = process.argv[2];
for (const [id, source, weight, kind, notice] of EXTRA) {
  if (!extras || !existsSync(join(extras, source))) {
    console.log(`${id}: skipped (no ${source} in the extras folder)`);
    continue;
  }
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const file = `${id}-${weight}${source.slice(source.lastIndexOf("."))}`;
  copyFileSync(join(extras, source), join(dir, file));
  const licenceText = await get(`https://raw.githubusercontent.com/spdx/license-list-data/main/text/${kind}.txt`);
  writeFileSync(join(dir, kind.startsWith("OFL") ? "OFL.txt" : "COPYING.txt"), `${notice}\n\n${licenceText}`);
  list[id] = [{ weight, url: `/image-fonts/${id}/${file}` }];
  console.log(`${id}: copied`);
}

writeFileSync(LIST, JSON.stringify(list, null, 2) + "\n");
console.log(`done: ${Object.keys(list).length} families, ${(bytes / 1024 / 1024).toFixed(1)} MB downloaded from Google`);
