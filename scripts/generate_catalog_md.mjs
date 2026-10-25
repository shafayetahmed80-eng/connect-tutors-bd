import fs from "fs";
import path from "path";

function parseSql(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const items = [];
  const regex = /\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*(?:'((?:[^']|'')*)'|NULL)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].replace(/''/g, "'").trim();
    const normalizedName = match[2].replace(/''/g, "'").trim();
    const division = match[3] ? match[3].replace(/''/g, "'").trim().toLowerCase() : null;
    if (name) {
      items.push({ name, normalizedName, division });
    }
  }
  return items;
}

const list1 = parseSql("C:/Projects/connect-tutors-bd/drizzle/0086_school_colleges.sql");
const list2 = parseSql("C:/Projects/connect-tutors-bd/drizzle/0135_expand_school_colleges_catalog.sql");
const list3 = parseSql("C:/Projects/connect-tutors-bd/drizzle/0136_add_prominent_canonical_institutions.sql");
const list4 = parseSql("C:/Projects/connect-tutors-bd/drizzle/0137_add_deep_research_institutions.sql");

// Deduplicate preserving the best casing / division
const map = new Map();
for (const item of [...list1, ...list2, ...list3, ...list4]) {
  if (!map.has(item.normalizedName)) {
    map.set(item.normalizedName, item);
  } else {
    // If previous had no division and this has one, update it
    const existing = map.get(item.normalizedName);
    if (!existing.division && item.division) {
      existing.division = item.division;
    }
  }
}

const allInstitutions = Array.from(map.values());
console.log(`Total unique institutions: ${allInstitutions.length}`);

// Division display metadata
const divisionMeta = {
  dhaka: { nameBn: "ঢাকা বিভাগ", nameEn: "Dhaka Division", flag: "🏛️" },
  chattogram: { nameBn: "চট্টগ্রাম বিভাগ", nameEn: "Chattogram Division", flag: "⚓" },
  rajshahi: { nameBn: "রাজশাহী বিভাগ", nameEn: "Rajshahi Division", flag: "🥭" },
  khulna: { nameBn: "খুলনা বিভাগ", nameEn: "Khulna Division", flag: "🐅" },
  barishal: { nameBn: "বরিশাল বিভাগ", nameEn: "Barishal Division", flag: "🌾" },
  sylhet: { nameBn: "সিলেট বিভাগ", nameEn: "Sylhet Division", flag: "🍵" },
  rangpur: { nameBn: "রংপুর বিভাগ", nameEn: "Rangpur Division", flag: "🌻" },
  mymensingh: { nameBn: "ময়মনসিংহ বিভাগ", nameEn: "Mymensingh Division", flag: "🏞️" },
  other: { nameBn: "অন্যান্য / সার্বজনীন", nameEn: "Other / Nationwide", flag: "🇧🇩" }
};

// Group by division
const grouped = {};
for (const key of Object.keys(divisionMeta)) {
  grouped[key] = [];
}

for (const item of allInstitutions) {
  const divKey = item.division && grouped[item.division] ? item.division : "other";
  grouped[divKey].push(item);
}

// Sort each division alphabetically
for (const key of Object.keys(grouped)) {
  grouped[key].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

// Build Markdown
let md = `# বাংলাদেশ স্কুল ও কলেজ ক্যাটালগ (Bangladesh Institutions Catalog)

> **আপডেট:** ২৫ অক্টোবর ২০২৬  
> **ক্যাটালগ স্ট্যাটাস:** সক্রিয় ও প্রোডাকশনে কার্যকর  
> **মোট অনন্য শিক্ষাপ্রতিষ্ঠান:** **${allInstitutions.length.toLocaleString("bn-BD")}** টি (${allInstitutions.length.toLocaleString("en-US")})  
> **ব্যবহারযোগ্য স্থান:** ১. গার্ডিয়ান রিকোয়েস্ট জার্নি (/request-tutor), ২. অ্যাডমিন প্যানেল অ্যাড টিউশন, ৩. টিউটর প্রোফাইল এডুকেশন সেকশন  

---

## 📊 বিভাগভিত্তিক সারসংক্ষেপ (Division-wise Summary)

| ক্রম | বিভাগ (Division) | কোড | মোট প্রতিষ্ঠান সংখ্যা |
|:---:|:---|:---:|:---:|
`;

let serial = 1;
for (const [key, meta] of Object.entries(divisionMeta)) {
  const count = grouped[key].length;
  if (count > 0) {
    md += `| ${serial++} | ${meta.flag} **${meta.nameBn}** (${meta.nameEn}) | \`${key}\` | **${count.toLocaleString("en-US")}** টি |\n`;
  }
}
md += `| | **সর্বমোট (Total)** | | **${allInstitutions.length.toLocaleString("en-US")}** টি |\n\n---\n\n`;

// Detail lists per division
for (const [key, meta] of Object.entries(divisionMeta)) {
  const list = grouped[key];
  if (list.length === 0) continue;

  md += `## ${meta.flag} ${meta.nameBn} (${meta.nameEn}) — ${list.length} টি\n\n`;
  md += `<details open>\n<summary><b>${meta.nameBn}-এর আওতাধীন স্কুল ও কলেজ তালিকা দেখতে ক্লিক করুন (${list.length}টি)</b></summary>\n\n`;
  
  // Table format with Serial and Name
  md += `| ক্রম | প্রতিষ্ঠানের নাম (Institution Name) |\n|:---:|:---|\n`;
  list.forEach((inst, index) => {
    md += `| ${index + 1} | ${inst.name} |\n`;
  });
  
  md += `\n</details>\n\n---\n\n`;
}

// Write to files
const outputPathRepo = "C:/Projects/connect-tutors-bd/docs/INSTITUTIONS_CATALOG.md";
const outputPathArtifact = "C:/Users/Shafayet Ahmed/.gemini/antigravity/brain/e5af699f-9ac6-4813-8caa-40cc8265b05f/updated_institutions_catalog.md";
const outputPathDownloads = "C:/Users/Shafayet Ahmed/Downloads/INSTITUTIONS_CATALOG.md";

fs.writeFileSync(outputPathRepo, md, "utf8");
fs.writeFileSync(outputPathArtifact, md, "utf8");
try {
  fs.writeFileSync(outputPathDownloads, md, "utf8");
  console.log(`Saved to Downloads: ${outputPathDownloads}`);
} catch (e) {
  console.warn("Could not write to downloads:", e.message);
}

console.log(`Successfully generated institutions catalog markdown!`);
console.log(`Saved to: ${outputPathRepo}`);
console.log(`Saved to: ${outputPathArtifact}`);
console.log(`File size: ${(Buffer.byteLength(md, 'utf8') / 1024).toFixed(1)} KB`);
