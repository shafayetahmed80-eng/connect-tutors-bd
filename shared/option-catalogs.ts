/**
 * The option catalogs an Owner can edit from the Admin panel.
 *
 * These are the lists the Tutor and Guardian forms are built from, so a missing
 * entry blocks a profile from being submitted at all - which is why they are
 * editable without a deploy. Institutes and departments are deliberately absent:
 * at 300+ rows each they need their own paginated screen.
 */
export const optionCatalogIds = ["subjects", "class-levels", "curricula", "student-types", "languages"] as const;
export type OptionCatalogId = (typeof optionCatalogIds)[number];

export type OptionCatalogMeta = {
  id: OptionCatalogId;
  label: string;
  /** Where a tutor or guardian meets this list, shown as help text. */
  usedFor: string;
  /** Singular noun for the add button and messages. */
  itemLabel: string;
};

export const optionCatalogs: OptionCatalogMeta[] = [
  { id: "subjects", label: "Subjects", usedFor: "Tutor profile and Request a tutor", itemLabel: "subject" },
  { id: "class-levels", label: "Class / level", usedFor: "Tutor profile and Request a tutor", itemLabel: "class or level" },
  { id: "curricula", label: "Curricula", usedFor: "Tutor profile and Request a tutor", itemLabel: "curriculum" },
  { id: "student-types", label: "Student types", usedFor: "Tutor profile", itemLabel: "student type" },
  { id: "languages", label: "Languages", usedFor: "Tutor profile", itemLabel: "language" },
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
