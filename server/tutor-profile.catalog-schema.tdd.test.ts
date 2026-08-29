import { readFileSync } from "node:fs";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";
import * as schema from "../drizzle/schema";

const expectedCatalogTables = [
  "universities",
  "facultyDepartments",
  "degreeMajors",
  "subjectsCatalog",
  "classLevels",
  "curricula",
  "studentTypes",
  "languagesCatalog",
] as const;

const expectedTutorSelectionTables = [
  "tutorAcademicProfiles",
  "tutorTeachingAreas",
  "tutorSubjects",
  "tutorClassLevels",
  "tutorCurricula",
  "tutorStudentTypes",
  "tutorPreferredClassSizes",
  "tutorPreferredTeachingDays",
  "tutorPreferredTimeSlots",
  "tutorTeachingLanguages",
  "tutorCommunicationPreferences",
] as const;

const migrationSource = readFileSync(
  new URL("../drizzle/0008_stiff_patriot.sql", import.meta.url),
  "utf8"
);
const migrationSnapshot = readFileSync(
  new URL("../drizzle/meta/0008_snapshot.json", import.meta.url),
  "utf8"
);

function expectIndexNames(
  table: typeof schema.universities,
  expectedNames: string[]
) {
  const indexNames = getTableConfig(table).indexes.map(
    index => index.config.name
  );
  expect(indexNames).toEqual(expect.arrayContaining(expectedNames));
}

function expectPrimaryKeyColumns(
  table: typeof schema.tutorTeachingAreas,
  expectedColumns: string[]
) {
  const config = getTableConfig(table);
  expect(config.primaryKeys).toHaveLength(1);
  expect(config.primaryKeys[0]?.columns.map(column => column.name)).toEqual(
    expectedColumns
  );
}

describe("TP-02 Tutor Profile catalog schema", () => {
  it("keeps public pre-registration Guardian phone intake in its own private lifecycle table", () => {
    expect(schema.guardianPhoneIntakes).toBeDefined();
    expect(getTableColumns(schema.guardianPhoneIntakes!)).toMatchObject({
      id: expect.anything(),
      phone: expect.anything(),
      status: expect.anything(),
      handoffTokenHash: expect.anything(),
      handoffExpiresAt: expect.anything(),
      phoneVerifiedAt: expect.anything(),
      completedAt: expect.anything(),
    });
  });

  it("exposes the normalized academic and controlled-selection catalog tables", () => {
    for (const tableName of expectedCatalogTables) {
      expect(schema[tableName]).toBeDefined();
    }

    const universityColumns = getTableColumns(schema.universities!);
    const facultyColumns = getTableColumns(schema.academicFaculties!);
    const departmentColumns = getTableColumns(schema.facultyDepartments!);
    const degreeColumns = getTableColumns(schema.degreeMajors!);

    expect(universityColumns).toMatchObject({
      id: expect.anything(),
      normalizedName: expect.anything(),
      active: expect.anything(),
    });
    expect(facultyColumns).toMatchObject({
      id: expect.anything(),
      universityId: expect.anything(),
      normalizedName: expect.anything(),
    });
    expect(departmentColumns).toMatchObject({
      id: expect.anything(),
      universityId: expect.anything(),
      facultyId: expect.anything(),
      normalizedName: expect.anything(),
    });
    expect(degreeColumns).toMatchObject({
      id: expect.anything(),
      facultyDepartmentId: expect.anything(),
      normalizedName: expect.anything(),
    });
  });

  it("exposes Tutor-owned academic, geographic, and multi-select relationship tables", () => {
    for (const tableName of expectedTutorSelectionTables) {
      expect(schema[tableName]).toBeDefined();
    }

    expect(getTableColumns(schema.tutorAcademicProfiles!)).toMatchObject({
      tutorId: expect.anything(),
      universityId: expect.anything(),
      facultyId: expect.anything(),
      facultyDepartmentId: expect.anything(),
    });

    expect(getTableColumns(schema.tutorSubjects!)).toMatchObject({
      tutorId: expect.anything(),
      subjectId: expect.anything(),
      selectionType: expect.anything(),
    });
  });

  it("exposes first-class ORM relations for the Faculty hierarchy", () => {
    expect(schema.academicFacultiesRelations).toBeDefined();
    expect(schema.universitiesRelations).toBeDefined();
    expect(schema.facultyDepartmentsRelations).toBeDefined();
    expect(schema.tutorAcademicProfilesRelations).toBeDefined();
  });

  it("keeps single-value Profile data on the private Tutor record rather than serialized selection text", () => {
    const tutorColumns = getTableColumns(schema.tutors);

    expect(tutorColumns).toMatchObject({
      profilePhotoKey: expect.anything(),
      dateOfBirth: expect.anything(),
      nationwideAvailability: expect.anything(),
      teachingExperienceYears: expect.anything(),
      monthlyFeeMin: expect.anything(),
      monthlyFeeMax: expect.anything(),
      preferredStudentGender: expect.anything(),
    });
  });

  it("defines the catalog uniqueness and lookup indexes required for safe searchable selectors", () => {
    expectIndexNames(schema.universities, [
      "universities_normalized_name_unique",
      "universities_active_sort_idx",
    ]);
    expectIndexNames(schema.academicFaculties, [
      "academic_faculties_university_normalized_unique",
      "academic_faculties_parent_active_sort_idx",
    ]);
    expectIndexNames(schema.facultyDepartments, [
      "faculty_departments_university_faculty_normalized_unique",
      "faculty_departments_parent_active_sort_idx",
      "faculty_departments_faculty_active_sort_idx",
    ]);
    expectIndexNames(schema.degreeMajors, [
      "degree_majors_faculty_normalized_unique",
      "degree_majors_parent_active_sort_idx",
    ]);

    for (const catalog of [
      schema.subjectsCatalog,
      schema.classLevels,
      schema.curricula,
      schema.studentTypes,
      schema.languagesCatalog,
    ]) {
      const config = getTableConfig(catalog);
      const indexNames = config.indexes.map(index => index.config.name);
      expect(indexNames).toContain(`${config.name}_normalized_name_unique`);
      expect(indexNames).toContain(`${config.name}_active_sort_idx`);
    }

    expectIndexNames(schema.tutorTeachingAreas, [
      "tutor_teaching_areas_location_idx",
    ]);
    expectIndexNames(schema.tutorSubjects, ["tutor_subjects_subject_idx"]);
    expectIndexNames(schema.tutorClassLevels, [
      "tutor_class_levels_catalog_idx",
    ]);
    expectIndexNames(schema.tutorCurricula, ["tutor_curricula_catalog_idx"]);
    expectIndexNames(schema.tutorStudentTypes, [
      "tutor_student_types_catalog_idx",
    ]);
    expectIndexNames(schema.tutorTeachingLanguages, [
      "tutor_teaching_languages_catalog_idx",
    ]);
  });

  it("uses composite primary keys to prevent duplicate Tutor multi-select selections", () => {
    expectPrimaryKeyColumns(schema.tutorTeachingAreas, [
      "tutorId",
      "locationId",
    ]);
    expectPrimaryKeyColumns(schema.tutorSubjects, [
      "tutorId",
      "subjectId",
      "selectionType",
    ]);
    expectPrimaryKeyColumns(schema.tutorClassLevels, [
      "tutorId",
      "classLevelId",
    ]);
    expectPrimaryKeyColumns(schema.tutorCurricula, ["tutorId", "curriculumId"]);
    expectPrimaryKeyColumns(schema.tutorStudentTypes, [
      "tutorId",
      "studentTypeId",
    ]);
    expectPrimaryKeyColumns(schema.tutorTeachingLanguages, [
      "tutorId",
      "languageId",
    ]);
    expectPrimaryKeyColumns(schema.tutorPreferredClassSizes, [
      "tutorId",
      "classSize",
    ]);
    expectPrimaryKeyColumns(schema.tutorPreferredTeachingDays, [
      "tutorId",
      "dayOfWeek",
    ]);
    expectPrimaryKeyColumns(schema.tutorPreferredTimeSlots, [
      "tutorId",
      "timeSlot",
    ]);
    expectPrimaryKeyColumns(schema.tutorCommunicationPreferences, [
      "tutorId",
      "channel",
    ]);
  });

  it("keeps the MySQL-safe academic faculty foreign-key name consistent across schema, snapshot, and migration source", () => {
    const expectedForeignKeyName = "tap_faculty_department_fk";

    expect(
      getTableConfig(schema.tutorAcademicProfiles).foreignKeys.map(foreignKey =>
        foreignKey.getName()
      )
    ).toContain(expectedForeignKeyName);
    expect(migrationSource).toContain(
      `ADD CONSTRAINT \`${expectedForeignKeyName}\``
    );
    expect(migrationSnapshot).toContain(`"name": "${expectedForeignKeyName}"`);
    expect(migrationSource).not.toContain(
      "tutor_academic_profiles_facultyDepartmentId_faculty_departments_id_fk"
    );
    expect(migrationSnapshot).not.toContain(
      "tutor_academic_profiles_facultyDepartmentId_faculty_departments_id_fk"
    );
  });

  it("uses MySQL-safe identifier lengths throughout the checked-in TP-02 migration source", () => {
    const identifiers = [
      ...migrationSource.matchAll(/(?:ADD CONSTRAINT|CREATE INDEX) `([^`]+)`/g),
    ].map(match => match[1]);

    expect(identifiers.length).toBeGreaterThan(0);
    for (const identifier of identifiers) {
      expect(
        identifier.length,
        `${identifier} must stay within MySQL's identifier limit`
      ).toBeLessThanOrEqual(64);
    }
  });
});
