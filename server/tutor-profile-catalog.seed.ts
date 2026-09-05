import { and, eq, notInArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  classLevels,
  curricula,
  facultyDepartments,
  studentTypes,
  subjectsCatalog,
  universities,
} from "../drizzle/schema";
import {
  suppliedBangladeshUniversities,
  suppliedInstituteDepartments,
} from "./bangladesh-university-hierarchy";

export type CatalogOptionSeed = {
  name: string;
  normalizedName: string;
  active: number;
  sortOrder: number;
};

export type TutorProfileCatalogSeedPlan = {
  universities: CatalogOptionSeed[];
  /** One flat global Department/Subject vocabulary — no Faculty layer, no per-institute list. */
  departments: CatalogOptionSeed[];
  subjects: CatalogOptionSeed[];
  classLevels: CatalogOptionSeed[];
  curricula: CatalogOptionSeed[];
  studentTypes: CatalogOptionSeed[];
};

/** Matches the normalized-name uniqueness convention for all searchable selectors. */
export function normalizeCatalogName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function createOptions(names: readonly string[]): CatalogOptionSeed[] {
  return names.map((name, index) => ({
    name,
    normalizedName: normalizeCatalogName(name),
    active: 1,
    sortOrder: index + 1,
  }));
}

function assertNoDuplicateKeys(keys: readonly string[], label: string) {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) {
      throw new Error(`Duplicate supplied ${label} key: ${key}`);
    }
    seen.add(key);
  }
}

/**
 * Maps the user-supplied website-ready JSON into database-ready catalog rows.
 * Institutes carry only name/status; Department/Subject is one flat global
 * vocabulary. Inactive institutes stay in the source for future curation but
 * seed with `active = 0` (not selectable).
 */
export function buildTutorProfileCatalogSeedPlan(): TutorProfileCatalogSeedPlan {
  assertNoDuplicateKeys(
    suppliedBangladeshUniversities.map(university => normalizeCatalogName(university.name)),
    "institute",
  );
  assertNoDuplicateKeys(
    suppliedInstituteDepartments.map(name => normalizeCatalogName(name)),
    "department",
  );

  const universitiesSeed = suppliedBangladeshUniversities.map((university, index) => ({
    name: university.name,
    normalizedName: normalizeCatalogName(university.name),
    active: university.status === "Active" ? 1 : 0,
    sortOrder: index + 1,
  }));

  return {
    universities: universitiesSeed,
    departments: createOptions(suppliedInstituteDepartments),
    subjects: createOptions([
      "Bangla",
      "English",
      "Mathematics",
      "Higher Mathematics",
      "General Science",
      "Physics",
      "Chemistry",
      "Biology",
      "ICT",
      "Accounting",
      "Finance and Banking",
      "Business Entrepreneurship",
      "Economics",
      "Civics and Citizenship",
      "History of Bangladesh and World Civilization",
      "Geography and Environment",
      "Islam and Moral Education",
      "Hindu Religion and Moral Education",
      "Agricultural Studies",
      "Home Science",
      "Statistics",
      "Computer Science",
      "Programming",
      "Admission Test Preparation",
      "IELTS Preparation",
      "Spoken English",
      "Arabic",
      "Quran and Tajweed",
      "Drawing and Painting",
      "Music",
    ]),
    classLevels: createOptions([
      "Pre-Primary",
      "Class 1",
      "Class 2",
      "Class 3",
      "Class 4",
      "Class 5",
      "Class 6",
      "Class 7",
      "Class 8",
      "SSC",
      "HSC",
      "O Level",
      "A Level",
      "University Admission",
      "Undergraduate",
      "Professional Skills",
    ]),
    curricula: createOptions([
      "Bangladesh National Curriculum",
      "English Medium",
      "English Version",
      "Madrasa Curriculum",
      "Cambridge International",
      "Pearson Edexcel",
      "International Baccalaureate",
    ]),
    studentTypes: createOptions([
      "School Student",
      "College Student",
      "University Admission Candidate",
      "Undergraduate Student",
      "Adult Learner",
      "Professional Learner",
    ]),
  };
}

type SeedDatabase = Pick<MySql2Database, "insert" | "select" | "update">;

async function upsertOptions(
  db: SeedDatabase,
  table: any,
  options: CatalogOptionSeed[],
) {
  if (options.length === 0) return;
  // Only refresh rows the seed itself owns. An Owner who renamed, reordered or
  // hid an option through the Admin panel would otherwise have that undone by
  // the next deploy, silently and with no record of it.
  await db.insert(table).values(options).onDuplicateKeyUpdate({
    set: {
      name: sql`IF(origin = 'seed', VALUES(name), name)`,
      active: sql`IF(origin = 'seed', VALUES(active), active)`,
      sortOrder: sql`IF(origin = 'seed', VALUES(sortOrder), sortOrder)`,
    },
  });
}

/** Applies the Institute and Department/Subject catalog atomically and idempotently. */
async function seedTutorProfileCatalogInTransaction(db: SeedDatabase) {
  const plan = buildTutorProfileCatalogSeedPlan();

  await upsertOptions(db, universities, plan.universities);
  await upsertOptions(db, facultyDepartments, plan.departments);

  // Renames and removed duplicates leave orphan rows under their old normalized
  // name. Deactivate any Institute or Department/Subject no longer in the
  // supplied directory so it stops being offered; the row itself stays so
  // existing tutor selections still resolve (and can be re-picked).
  const planUniversityNames = plan.universities.map(option => option.normalizedName);
  const planDepartmentNames = plan.departments.map(option => option.normalizedName);
  // Scoped to seed-owned rows for the same reason as the upsert: an Owner's own
  // entry is absent from the plan by definition, so an unscoped sweep would
  // switch off exactly the rows they added.
  await db
    .update(universities)
    .set({ active: 0 })
    .where(and(eq(universities.active, 1), eq(universities.origin, "seed"), notInArray(universities.normalizedName, planUniversityNames)));
  await db
    .update(facultyDepartments)
    .set({ active: 0 })
    .where(and(eq(facultyDepartments.active, 1), eq(facultyDepartments.origin, "seed"), notInArray(facultyDepartments.normalizedName, planDepartmentNames)));

  await Promise.all([
    upsertOptions(db, subjectsCatalog, plan.subjects),
    upsertOptions(db, classLevels, plan.classLevels),
    upsertOptions(db, curricula, plan.curricula),
    upsertOptions(db, studentTypes, plan.studentTypes),
  ]);

  return {
    universities: plan.universities.length,
    facultyDepartments: plan.departments.length,
    subjects: plan.subjects.length,
    classLevels: plan.classLevels.length,
    curricula: plan.curricula.length,
    studentTypes: plan.studentTypes.length,
  };
}

/**
 * Writes the catalog records atomically. Database uniqueness keys make repeated
 * runs idempotent, while the transaction prevents partial imports.
 */
export async function seedTutorProfileCatalog(db: MySql2Database) {
  return db.transaction(async transaction =>
    seedTutorProfileCatalogInTransaction(transaction),
  );
}
