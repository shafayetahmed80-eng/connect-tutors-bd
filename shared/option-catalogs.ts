/**
 * The option catalogs an Owner can edit from the Admin panel.
 *
 * These are the lists the Tutor profile is built from, so a missing entry
 * blocks a profile from being submitted at all - which is why they are editable
 * without a deploy. Institutes and departments are deliberately absent: at 300+
 * rows each they need their own paginated screen.
 *
 * "student-types" was here until the Tutor profile stopped asking who a Tutor
 * teaches. The `student_types` table and every row a Tutor already chose are
 * untouched; if the field returns, so does its line below.
 *
 * "languages" was here until the Tutor profile dropped the Language &
 * communication sub-section. Its table and the two junction tables it fed
 * (`languages_catalog`, `tutor_teaching_languages`,
 * `tutor_communication_preferences`) were all dropped in the same change - the
 * site was pre-launch with only demo data - so this one does not come back for
 * free.
 */
export const optionCatalogIds = ["subjects", "class-levels", "curricula"] as const;
export type OptionCatalogId = (typeof optionCatalogIds)[number];

export type OptionCatalogMeta = {
  id: OptionCatalogId;
  label: string;
  /** Where a tutor or guardian meets this list, shown as help text. */
  usedFor: string;
  /** Singular noun for the add button and messages. */
  itemLabel: string;
};

/**
 * `usedFor` is read by an Owner deciding whether an edit here is worth making,
 * so it has to name the screens that actually read the catalog.
 *
 * These three said "Tutor profile and Request a tutor". They are not read by
 * Request a tutor: that form's categories, levels and subjects are a tree -
 * a category picks its levels, and the pair picks the subjects - held in
 * `GuardianRequestJourney`, and these catalogs are flat lists with no parent
 * to hang that off. The Guardian side has no read path to them either;
 * `catalog.searchSubjects` and its siblings are `activeTutorProcedure`.
 */
export const optionCatalogs: OptionCatalogMeta[] = [
  { id: "subjects", label: "Subjects", usedFor: "Tutor profile", itemLabel: "subject" },
  { id: "class-levels", label: "Class / level", usedFor: "Tutor profile", itemLabel: "class or level" },
  { id: "curricula", label: "Curricula", usedFor: "Tutor profile", itemLabel: "curriculum" },
];

export function findOptionCatalog(id: string): OptionCatalogMeta | undefined {
  return optionCatalogs.find(catalog => catalog.id === id);
}

/** Longest an option name may be; matches the `varchar(160)` catalog column. */
export const MAX_OPTION_NAME_LENGTH = 160;

/**
 * Rows the seed owns can be renamed, hidden and reordered but never deleted:
 * the shipped defaults are part of the product, and a deploy would recreate a
 * deleted one anyway. Only an Owner's own additions can be removed, and only
 * while nothing has selected them.
 */
export type OptionCatalogOrigin = "seed" | "admin";

/**
 * The two large catalogs, kept apart from the five above because they behave
 * differently rather than because they hold different things.
 *
 * At 300-odd rows each, listing them whole is neither usable nor cheap, so
 * these are searched and paged on the server. Manual ordering is not offered
 * either: dragging one row through three hundred is no way to arrange
 * anything, so they read alphabetically and search is how you find a row.
 *
 * Their `varchar(240)` columns are wider than the small catalogs' 160, because
 * an institute's full name with its abbreviation runs long.
 */
export const largeCatalogIds = ["institutes", "departments"] as const;
export type LargeCatalogId = (typeof largeCatalogIds)[number];

export type LargeCatalogMeta = Omit<OptionCatalogMeta, "id"> & { id: LargeCatalogId };

export const largeCatalogs: LargeCatalogMeta[] = [
  { id: "institutes", label: "Institutes", usedFor: "Tutor profile education", itemLabel: "institute" },
  { id: "departments", label: "Departments / subjects", usedFor: "Tutor profile education", itemLabel: "department" },
];

export function findLargeCatalog(id: string): LargeCatalogMeta | undefined {
  return largeCatalogs.find(catalog => catalog.id === id);
}

/** Longest a large-catalog name may be; matches their `varchar(240)` columns. */
export const MAX_LARGE_CATALOG_NAME_LENGTH = 240;

/** Rows returned per page. Enough to scan, small enough to render instantly. */
export const LARGE_CATALOG_PAGE_SIZE = 25;
