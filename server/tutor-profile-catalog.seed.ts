import { and, eq, notInArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  academicFaculties,
  classLevels,
  curricula,
  facultyDepartments,
  languagesCatalog,
  studentTypes,
  subjectsCatalog,
  universities,
} from "../drizzle/schema";
import { suppliedBangladeshUniversities } from "./bangladesh-university-hierarchy";

export type CatalogOptionSeed = {
  name: string;
  normalizedName: string;
  active: number;
  sortOrder: number;
};

type FacultySeed = CatalogOptionSeed & {
  universityNormalizedName: string;
};

type DepartmentSeed = CatalogOptionSeed & {
  universityNormalizedName: string;
  facultyNormalizedName: string;
};

export type TutorProfileCatalogSeedPlan = {
  universities: CatalogOptionSeed[];
  faculties: FacultySeed[];
  departments: DepartmentSeed[];
  subjects: CatalogOptionSeed[];
  classLevels: CatalogOptionSeed[];
  curricula: CatalogOptionSeed[];
  studentTypes: CatalogOptionSeed[];
  languages: CatalogOptionSeed[];
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
      throw new Error(`Duplicate supplied ${label} hierarchy key: ${key}`);
    }
    seen.add(key);
  }
}

/**
 * Maps the user-supplied website-ready JSON into database-ready parent-linked
 * catalog records. Only active institutions and their children are selectable;
 * the source retains inactive entries for future administrative curation.
 */
export function buildTutorProfileCatalogSeedPlan(): TutorProfileCatalogSeedPlan {
  const universitiesSeed: CatalogOptionSeed[] = [];
  const faculties: FacultySeed[] = [];
  const departments: DepartmentSeed[] = [];

  assertNoDuplicateKeys(
    suppliedBangladeshUniversities.map(university =>
      normalizeCatalogName(university.name)
    ),
    "university"
  );

  for (let universityIndex = 0; universityIndex < suppliedBangladeshUniversities.length; universityIndex += 1) {
    const university = suppliedBangladeshUniversities[universityIndex]!;
    const universityNormalizedName = normalizeCatalogName(university.name);
    const active = university.status === "Active" ? 1 : 0;
    universitiesSeed.push({
      name: university.name,
      normalizedName: universityNormalizedName,
      active,
      sortOrder: universityIndex + 1,
    });

    assertNoDuplicateKeys(
      university.faculties.map(faculty => normalizeCatalogName(faculty.name)),
      `${university.name} faculty`
    );

    for (let facultyIndex = 0; facultyIndex < university.faculties.length; facultyIndex += 1) {
      const faculty = university.faculties[facultyIndex]!;
      const facultyNormalizedName = normalizeCatalogName(faculty.name);
      faculties.push({
        name: faculty.name,
        normalizedName: facultyNormalizedName,
        universityNormalizedName,
        active,
        sortOrder: facultyIndex + 1,
      });

      assertNoDuplicateKeys(
        faculty.departments.map(department => normalizeCatalogName(department)),
        `${university.name} / ${faculty.name} department`
      );

      for (
        let departmentIndex = 0;
        departmentIndex < faculty.departments.length;
        departmentIndex += 1
      ) {
        const name = faculty.departments[departmentIndex]!;
        departments.push({
          name,
          normalizedName: normalizeCatalogName(name),
          universityNormalizedName,
          facultyNormalizedName,
          active,
          sortOrder: departmentIndex + 1,
        });
      }
    }
  }

  return {
    universities: universitiesSeed,
    faculties,
    departments,
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
    languages: createOptions(["Bangla", "English", "Arabic", "Hindi", "Urdu", "French"]),
  };
}

type SeedDatabase = Pick<MySql2Database, "insert" | "select" | "update">;

async function upsertOptions(
  db: SeedDatabase,
  table: any,
  options: CatalogOptionSeed[]
) {
  if (options.length === 0) return;
  await db.insert(table).values(options).onDuplicateKeyUpdate({
    set: {
      name: sql`VALUES(name)`,
      active: sql`VALUES(active)`,
      sortOrder: sql`VALUES(sortOrder)`,
    },
  });
}

/** Applies the supplied parent-linked academic hierarchy atomically and idempotently. */
async function seedTutorProfileCatalogInTransaction(db: SeedDatabase) {
  const plan = buildTutorProfileCatalogSeedPlan();
  await upsertOptions(db, universities, plan.universities);

  const universityRows = await db
    .select({ id: universities.id, normalizedName: universities.normalizedName })
    .from(universities);
  const universityIdByNormalizedName = new Map(
    universityRows.map(row => [row.normalizedName, row.id])
  );

  const facultyRows = plan.faculties.map(faculty => {
    const universityId = universityIdByNormalizedName.get(
      faculty.universityNormalizedName
    );
    if (!universityId) {
      throw new Error(`Missing parent university for faculty: ${faculty.name}`);
    }
    return { ...faculty, universityId };
  });
  if (facultyRows.length > 0) {
    await db.insert(academicFaculties).values(
      facultyRows.map(({ universityNormalizedName, ...row }) => row)
    ).onDuplicateKeyUpdate({
      set: {
        name: sql`VALUES(name)`,
        active: sql`VALUES(active)`,
        sortOrder: sql`VALUES(sortOrder)`,
      },
    });
  }

  const facultyCatalogRows = await db
    .select({
      id: academicFaculties.id,
      universityId: academicFaculties.universityId,
      normalizedName: academicFaculties.normalizedName,
    })
    .from(academicFaculties);
  const facultyIdByParentAndNormalizedName = new Map(
    facultyCatalogRows.map(row => [`${row.universityId}:${row.normalizedName}`, row.id])
  );

  const departmentRows = plan.departments.map(department => {
    const universityId = universityIdByNormalizedName.get(
      department.universityNormalizedName
    );
    const facultyId = universityId
      ? facultyIdByParentAndNormalizedName.get(
          `${universityId}:${department.facultyNormalizedName}`
        )
      : undefined;
    if (!universityId || !facultyId) {
      throw new Error(`Missing Faculty parent for department: ${department.name}`);
    }
    return { ...department, universityId, facultyId };
  });
  if (departmentRows.length > 0) {
    await db.insert(facultyDepartments).values(
      departmentRows.map(
        ({ universityNormalizedName, facultyNormalizedName, ...row }) => row
      )
    ).onDuplicateKeyUpdate({
      set: {
        name: sql`VALUES(name)`,
        active: sql`VALUES(active)`,
        sortOrder: sql`VALUES(sortOrder)`,
      },
    });
  }

  // Renames and removed duplicates leave orphan rows under their old normalized
  // name. Deactivate any Institute no longer in the supplied directory so it
  // stops being offered; the row itself stays so existing tutor selections
  // still resolve (and can be re-picked against the current name).
  const planUniversityNormalizedNames = plan.universities.map(university => university.normalizedName);
  if (planUniversityNormalizedNames.length > 0) {
    await db
      .update(universities)
      .set({ active: 0 })
      .where(
        and(
          eq(universities.active, 1),
          notInArray(universities.normalizedName, planUniversityNormalizedNames),
        ),
      );
  }

  await Promise.all([
    upsertOptions(db, subjectsCatalog, plan.subjects),
    upsertOptions(db, classLevels, plan.classLevels),
    upsertOptions(db, curricula, plan.curricula),
    upsertOptions(db, studentTypes, plan.studentTypes),
    upsertOptions(db, languagesCatalog, plan.languages),
  ]);

  return {
    universities: plan.universities.length,
    faculties: plan.faculties.length,
    facultyDepartments: plan.departments.length,
    subjects: plan.subjects.length,
    classLevels: plan.classLevels.length,
    curricula: plan.curricula.length,
    studentTypes: plan.studentTypes.length,
    languages: plan.languages.length,
  };
}

/**
 * Writes the related catalog records atomically. Database uniqueness keys make
 * repeated runs idempotent, while the transaction prevents partial imports.
 */
export async function seedTutorProfileCatalog(db: MySql2Database) {
  return db.transaction(async transaction =>
    seedTutorProfileCatalogInTransaction(transaction)
  );
}
