/**
 * The rules the Owner's City & Location editor works by.
 *
 * Unlike every other option list on the site, locations are a tree: a Guardian
 * picks a city and then an area inside it, so a row nobody can reach through
 * its parent is a row nobody can pick. That makes "which parent" part of
 * adding a location, not an afterthought.
 */
export const locationTypes = [
  "country",
  "division",
  "district",
  "city",
  "upazila",
  "thana",
  "subdivision",
  "area",
] as const;

export type LocationType = (typeof locationTypes)[number];

/**
 * How deep a type sits. A parent must rank strictly above its child; nothing
 * else is enforced, because the catalog is not a tidy administrative ladder.
 * Areas already hang off cities, districts and thanas alike, and cities and
 * districts are siblings under the country.
 *
 * Every one of the 597 rows shipped satisfies this rule, which is where it
 * came from - it describes the catalog rather than an ideal of Bangladeshi
 * geography, so it will not reject a shape the site already contains.
 */
export const locationTypeRank: Record<LocationType, number> = {
  country: 0,
  division: 1,
  district: 2,
  city: 2,
  upazila: 3,
  thana: 3,
  subdivision: 4,
  area: 5,
};

export const locationTypeLabels: Record<LocationType, string> = {
  country: "Country",
  division: "Division",
  district: "District",
  city: "City",
  upazila: "Upazila",
  thana: "Thana",
  subdivision: "Subdivision",
  area: "Area",
};

/** The types that may be added beneath a parent of this type. */
export function childTypesFor(parentType: LocationType): LocationType[] {
  return locationTypes.filter(type => locationTypeRank[type] > locationTypeRank[parentType]);
}

export function isValidChildType(parentType: LocationType, childType: LocationType): boolean {
  return locationTypeRank[childType] > locationTypeRank[parentType];
}

/** Matches the `varchar(160)` label column. */
export const MAX_LOCATION_LABEL_LENGTH = 160;

/** Matches the `varchar(80)` primary key. */
export const MAX_LOCATION_ID_LENGTH = 80;

/** Rows per page. Dhaka alone holds 101 children, so a level still pages. */
export const LOCATION_PAGE_SIZE = 25;

/**
 * Turns a label into an id in the style of the ones already stored
 * (`dhaka-city`, `bd`). Ids are only ever generated, never typed, but they end
 * up in URLs and saved profiles, so they stay readable.
 *
 * A label with no Latin letters - a Bangla one - slugifies to nothing, so the
 * caller is handed an empty string and falls back to a generated id.
 */
export function locationSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LOCATION_ID_LENGTH);
}
