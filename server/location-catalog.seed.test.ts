import { describe, expect, it } from "vitest";
import { suppliedLocations } from "./location-catalog.seed";
import { isValidChildType, locationTypes, type LocationType } from "@shared/location-catalog";

/**
 * The shipped catalog is data, and data rots quietly. These check the file
 * itself rather than the database, so a bad export is caught before it is
 * seeded anywhere.
 */
describe("shipped location catalog", () => {
  const byId = new Map(suppliedLocations.map(row => [row.id, row]));

  it("carries the whole tree, not a fragment", () => {
    // A fresh `db:migrate` alone gives 162 rows with two cities and no thanas,
    // which is why this file exists at all.
    expect(suppliedLocations.length).toBe(1282);
  });

  it("has exactly one root, and it is the country", () => {
    const roots = suppliedLocations.filter(row => row.parentId === null);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ id: "bd", type: "country" });
  });

  it("gives every id once", () => {
    expect(byId.size).toBe(suppliedLocations.length);
  });

  it("leaves nothing orphaned", () => {
    // A row whose parent is missing is a row no breadcrumb reaches.
    const orphans = suppliedLocations.filter(row => row.parentId !== null && !byId.has(row.parentId));
    expect(orphans.map(row => row.id)).toEqual([]);
  });

  it("lists a parent before its children, because the seed inserts in file order", () => {
    const seen = new Set<string>();
    for (const row of suppliedLocations) {
      if (row.parentId !== null) {
        expect(seen.has(row.parentId), `${row.id} comes before its parent ${row.parentId}`).toBe(true);
      }
      seen.add(row.id);
    }
  });

  it("obeys the same rank rule the Admin editor enforces", () => {
    // Otherwise the Owner could not have added these rows themselves, and the
    // shipped data would contradict the screen that edits it.
    for (const row of suppliedLocations) {
      if (row.parentId === null) continue;
      const parent = byId.get(row.parentId)!;
      expect(
        isValidChildType(parent.type as LocationType, row.type as LocationType),
        `${parent.type} -> ${row.type} (${row.id})`,
      ).toBe(true);
    }
  });

  it("uses only types the schema declares", () => {
    for (const row of suppliedLocations) {
      expect(locationTypes as readonly string[], row.id).toContain(row.type);
    }
  });

  it("has no two places sharing a name under one parent", () => {
    // The unique index is (parentId, type, label); a clash would make the seed
    // fail partway through on a fresh database.
    const seen = new Set<string>();
    for (const row of suppliedLocations) {
      const key = `${row.parentId ?? "-"}|${row.type}|${row.label}`;
      expect(seen.has(key), `duplicate: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("labels every row and keeps them inside the column", () => {
    for (const row of suppliedLocations) {
      expect(row.label.trim().length, row.id).toBeGreaterThan(0);
      expect(row.label.length, row.id).toBeLessThanOrEqual(160);
      expect(row.id.length, row.id).toBeLessThanOrEqual(80);
    }
  });
  it("includes high-demand residential and tuition locations across major divisions", () => {
    const keyLocations = [
      { id: "dhaka-area-nikunja-1", label: "Nikunja 1", parentId: "dhaka-city" },
      { id: "dhaka-area-nikunja-2", label: "Nikunja 2", parentId: "dhaka-city" },
      { id: "dhaka-area-niketon", label: "Niketon", parentId: "dhaka-city" },
      { id: "dhaka-area-kazipara", label: "Kazipara", parentId: "dhaka-city" },
      { id: "dhaka-area-shewrapara", label: "Shewrapara", parentId: "dhaka-city" },
      { id: "chattogram-area-2-no-gate", label: "2 No Gate", parentId: "chattogram-city" },
      { id: "sylhet-area-shahi-eidgah", label: "Shahi Eidgah", parentId: "sylhet-city" },
      { id: "rajshahi-area-vodra-more", label: "Vodra More", parentId: "rajshahi-city" },
      { id: "khulna-area-moylapota-more", label: "Moylapota More", parentId: "khulna-city" },
      { id: "barishal-area-natun-bazar", label: "Natun Bazar", parentId: "barishal-city" },
      { id: "mymensingh-area-ganginarpar-more", label: "Ganginarpar More", parentId: "mymensingh-city" },
      { id: "rangpur-area-jahaj-company-more", label: "Jahaj Company More", parentId: "rangpur-city" },
    ];

    for (const expected of keyLocations) {
      const match = byId.get(expected.id);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        id: expected.id,
        label: expected.label,
        parentId: expected.parentId,
        type: "area",
      });
    }
  });
  it("includes high-demand Phase 2 residential, educational, and tuition hubs", () => {
    const keyLocations = [
      { id: "dhaka-area-lalmatia", label: "Lalmatia", parentId: "dhaka-city" },
      { id: "dhaka-area-segunbagicha", label: "Segunbagicha", parentId: "dhaka-city" },
      { id: "dhaka-area-central-road", label: "Central Road", parentId: "dhaka-city" },
      { id: "dhaka-area-rupnagar-ra", label: "Rupnagar R/A", parentId: "dhaka-city" },
      { id: "chattogram-area-cheragi-pahar", label: "Cheragi Pahar", parentId: "chattogram-city" },
      { id: "chattogram-area-or-nizam-road", label: "OR Nizam Road", parentId: "chattogram-city" },
      { id: "sylhet-area-housing-estate", label: "Housing Estate", parentId: "sylhet-city" },
      { id: "sylhet-area-kajolshah", label: "Kajolshah", parentId: "sylhet-city" },
      { id: "rajshahi-area-terokhadia", label: "Terokhadia", parentId: "rajshahi-city" },
      { id: "khulna-area-khulna-university-campus", label: "Khulna University Campus Area", parentId: "khulna-city" },
      { id: "barishal-area-barishal-university-campus", label: "Barishal University Campus", parentId: "barishal-city" },
      { id: "mymensingh-area-sankipara", label: "Sankipara", parentId: "mymensingh-city" },
      { id: "rangpur-area-rk-road", label: "RK Road", parentId: "rangpur-city" },
      { id: "cumilla-area-victoria-college-area", label: "Victoria College Area", parentId: "cumilla-district" },
      { id: "gazipur-area-chandona-chowrasta", label: "Chandona Chowrasta", parentId: "gazipur-district" },
      { id: "narayanganj-area-chashara-more", label: "Chashara More", parentId: "narayanganj-district" },
      { id: "narayanganj-area-masdair", label: "Masdair", parentId: "narayanganj-district" },
    ];

    for (const expected of keyLocations) {
      const match = byId.get(expected.id);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        id: expected.id,
        label: expected.label,
        parentId: expected.parentId,
        type: "area",
      });
    }
  });
  it("includes high-demand Phase 3 residential, educational, and tuition hubs across Dhaka, regional cities, and new education hubs", () => {
    const keyLocations = [
      { id: "dhaka-area-tolarbagh", label: "Tolarbagh", parentId: "dhaka-city", type: "area" },
      { id: "dhaka-area-satmasjid-road", label: "Satmasjid Road", parentId: "dhaka-city", type: "area" },
      { id: "dhaka-area-north-south-university-area", label: "North South University Area", parentId: "dhaka-city", type: "area" },
      { id: "chattogram-area-nasirabad-housing-society", label: "Nasirabad Housing Society", parentId: "chattogram-city", type: "area" },
      { id: "sylhet-area-subidbazar-bonolota-ra", label: "Subidbazar Bonolota R/A", parentId: "sylhet-city", type: "area" },
      { id: "rajshahi-area-rmc-campus", label: "Rajshahi Medical College Campus", parentId: "rajshahi-city", type: "area" },
      { id: "khulna-area-boyra-college-road", label: "Boyra College Road", parentId: "khulna-city", type: "area" },
      { id: "barishal-area-choumatha", label: "Choumatha", parentId: "barishal-city", type: "area" },
      { id: "mymensingh-area-charpara-medical-mor", label: "Charpara Medical Mor", parentId: "mymensingh-city", type: "area" },
      { id: "rangpur-area-kachari-bazar", label: "Kachari Bazar Rangpur", parentId: "rangpur-city", type: "area" },
      { id: "cumilla-area-ranir-bazar", label: "Ranir Bazar Cumilla", parentId: "cumilla-district", type: "area" },
      { id: "gazipur-area-duet-campus-area", label: "DUET Campus Area Gazipur", parentId: "gazipur-district", type: "area" },
      { id: "narayanganj-area-signboard", label: "Signboard Narayanganj", parentId: "narayanganj-district", type: "area" },
      { id: "tangail-area-mbstu-campus", label: "MBSTU Campus Area", parentId: "tangail-city", type: "area" },
      { id: "sirajganj-area-mujib-sadak", label: "Mujib Sadak Sirajganj", parentId: "sirajganj-city", type: "area" },
      // New education hubs
      { id: "bogura-city", label: "Bogura", parentId: "bd", type: "city" },
      { id: "bogura-area-jaleshwaritola", label: "Jaleshwaritola", parentId: "bogura-city", type: "area" },
      { id: "bogura-area-azizul-haque-college-area", label: "Azizul Haque College Area", parentId: "bogura-city", type: "area" },
      { id: "jashore-city", label: "Jashore", parentId: "bd", type: "city" },
      { id: "jashore-area-just-campus-area", label: "JUST Campus Area", parentId: "jashore-city", type: "area" },
      { id: "jashore-area-mm-college-area", label: "MM College Area", parentId: "jashore-city", type: "area" },
      { id: "kushtia-city", label: "Kushtia", parentId: "bd", type: "city" },
      { id: "kushtia-area-iu-campus-area", label: "Islamic University Campus Area", parentId: "kushtia-city", type: "area" },
      { id: "kushtia-area-ns-road", label: "NS Road Kushtia", parentId: "kushtia-city", type: "area" },
    ];

    for (const expected of keyLocations) {
      const match = byId.get(expected.id);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        id: expected.id,
        label: expected.label,
        parentId: expected.parentId,
        type: expected.type,
      });
    }
  });
  it("includes high-demand Phase 4 residential, educational, and tuition hubs across Dhaka, regional cities, and new education hubs", () => {
    const keyLocations = [
      { id: "dhaka-area-senpara-parbata", label: "Senpara Parbata", parentId: "dhaka-city", type: "area" },
      { id: "dhaka-area-bashundhara-block-a", label: "Bashundhara Block A", parentId: "dhaka-city", type: "area" },
      { id: "dhaka-area-laxmibazar", label: "Laxmibazar Old Dhaka", parentId: "dhaka-city", type: "area" },
      { id: "dhaka-area-uiu-campus-area", label: "United International University Campus Area", parentId: "dhaka-city", type: "area" },
      { id: "chattogram-area-cmc-campus-area", label: "Chittagong Medical College Campus Area", parentId: "chattogram-city", type: "area" },
      { id: "sylhet-area-chowhatta-point", label: "Chowhatta Point", parentId: "sylhet-city", type: "area" },
      { id: "rajshahi-area-kazla-gate-ru", label: "Kazla Gate RU", parentId: "rajshahi-city", type: "area" },
      { id: "khulna-area-bl-college-area", label: "Govt BL College Area", parentId: "khulna-city", type: "area" },
      { id: "barishal-area-bm-college-main-gate", label: "BM College Main Gate Area", parentId: "barishal-city", type: "area" },
      { id: "mymensingh-area-ananda-mohan-college-gate", label: "Ananda Mohan College Gate Area", parentId: "mymensingh-city", type: "area" },
      { id: "rangpur-area-carmichael-college-campus", label: "Carmichael College Campus Area", parentId: "rangpur-city", type: "area" },
      { id: "cumilla-area-victoria-college-degree-dharmapur", label: "Victoria Govt College Degree Branch Dharmapur", parentId: "cumilla-district", type: "area" },
      { id: "gazipur-area-bsmrau-campus-area", label: "BSMRAU Campus Area Gazipur", parentId: "gazipur-district", type: "area" },
      { id: "narayanganj-area-chashara-railway-station", label: "Chashara Railway Station Area", parentId: "narayanganj-district", type: "area" },
      { id: "tangail-area-santosh-mbstu-gate", label: "Santosh MBSTU Gate Area", parentId: "tangail-city", type: "area" },
      { id: "sirajganj-area-station-road", label: "Station Road Sirajganj", parentId: "sirajganj-city", type: "area" },
      { id: "bogura-area-jahurul-nagar", label: "Jahurul Nagar Bogura", parentId: "bogura-city", type: "area" },
      { id: "jashore-area-ghop-central-road", label: "Ghop Central Road Jashore", parentId: "jashore-city", type: "area" },
      { id: "kushtia-area-mill-para", label: "Mill Para Kushtia", parentId: "kushtia-city", type: "area" },
      // New education hub cities and areas
      { id: "feni-city", label: "Feni", parentId: "bd", type: "city" },
      { id: "feni-area-masterpara", label: "Masterpara Feni", parentId: "feni-city", type: "area" },
      { id: "dinajpur-city", label: "Dinajpur", parentId: "bd", type: "city" },
      { id: "dinajpur-area-balubari", label: "Balubari Dinajpur", parentId: "dinajpur-city", type: "area" },
      { id: "pabna-city", label: "Pabna", parentId: "bd", type: "city" },
      { id: "pabna-area-edward-college-area", label: "Govt Edward College Area", parentId: "pabna-city", type: "area" },
      { id: "faridpur-city", label: "Faridpur", parentId: "bd", type: "city" },
      { id: "faridpur-area-jhiltuli", label: "Jhiltuli Faridpur", parentId: "faridpur-city", type: "area" },
      { id: "brahmanbaria-city", label: "Brahmanbaria", parentId: "bd", type: "city" },
      { id: "brahmanbaria-area-medda", label: "Medda Brahmanbaria", parentId: "brahmanbaria-city", type: "area" },
      { id: "narsingdi-city", label: "Narsingdi", parentId: "bd", type: "city" },
      { id: "narsingdi-area-satirpara", label: "Satirpara Narsingdi", parentId: "narsingdi-city", type: "area" },
      { id: "noakhali-city", label: "Noakhali", parentId: "bd", type: "city" },
      { id: "noakhali-area-maijdee-court", label: "Maijdee Court", parentId: "noakhali-city", type: "area" },
      { id: "coxs-bazar-city", label: "Coxs Bazar", parentId: "bd", type: "city" },
      { id: "coxs-bazar-area-jhawtola", label: "Jhawtola Coxs Bazar", parentId: "coxs-bazar-city", type: "area" },
    ];

    for (const expected of keyLocations) {
      const match = byId.get(expected.id);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        id: expected.id,
        label: expected.label,
        parentId: expected.parentId,
        type: expected.type,
      });
    }
  });
});
