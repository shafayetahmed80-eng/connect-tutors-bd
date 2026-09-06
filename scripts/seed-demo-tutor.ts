/**
 * Seeds one fully-completed demo Tutor account into the local database.
 *
 *   pnpm tsx scripts/seed-demo-tutor.ts
 *
 * Re-runnable: if the demo email already exists the script reuses that
 * account and just re-saves the profile. It drives the app's own write
 * functions (registerPasswordTutor / saveTutorProfileDraft / submitTutorProfile),
 * so every table and every validation rule is exercised exactly as a real
 * Tutor would hit them. Catalog ids (subjects, levels, curricula, university,
 * department, locations) are read live from this database.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import {
  registerPasswordTutor,
  saveTutorProfileDraft,
  submitTutorProfile,
  saveTutorProfilePhotoKey,
  saveTutorUniversityIdDocument,
  saveTutorSupportingDocument,
} from "../server/db";

const DEMO = {
  name: "Tanvir Ahmed",
  email: "demo.tutor@connecttutors.test",
  password: "DemoTutor#2026",
  phone: "+8801712345670",
  gender: "male" as const,
};

async function pickCatalogIds() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const one = async (sql: string, args: unknown[] = []) => {
    const [rows] = (await conn.query(sql, args)) as [Array<Record<string, unknown>>, unknown];
    return rows;
  };

  const [city] = await one(
    "SELECT id FROM locations WHERE type='city' AND country='Bangladesh' AND enabled=1 ORDER BY (label='Dhaka') DESC, label LIMIT 1",
  );
  if (!city) throw new Error("No enabled Bangladesh city in `locations` - seed locations first.");
  const cityId = String(city.id);

  const childRows = await one(
    "SELECT id FROM locations WHERE parentId=? AND enabled=1 ORDER BY label LIMIT 4",
    [cityId],
  );
  if (childRows.length < 1) throw new Error(`City ${cityId} has no enabled child locations.`);
  const childIds = childRows.map(r => String(r.id));

  const subjectRows = await one("SELECT id FROM subjects_catalog WHERE active=1 ORDER BY sortOrder, id LIMIT 4");
  const levelRows = await one("SELECT id FROM class_levels WHERE active=1 ORDER BY sortOrder, id LIMIT 3");
  const curriculumRows = await one("SELECT id FROM curricula WHERE active=1 ORDER BY sortOrder, id LIMIT 2");
  const [university] = await one("SELECT id FROM universities WHERE active=1 ORDER BY sortOrder, id LIMIT 1");
  const [department] = await one("SELECT id FROM faculty_departments WHERE active=1 ORDER BY sortOrder, id LIMIT 1");
  if (subjectRows.length < 3 || levelRows.length < 2 || curriculumRows.length < 2 || !university || !department) {
    throw new Error("Catalog is not seeded - run `pnpm run db:seed:tutor-profile-catalog` first.");
  }
  const departmentId = Number(department.id);
  const [degreeMajor] = await one(
    "SELECT id FROM degree_majors WHERE active=1 AND facultyDepartmentId=? ORDER BY id LIMIT 1",
    [departmentId],
  );
  const studentTypeRows = await one("SELECT id FROM student_types WHERE active=1 ORDER BY sortOrder, id LIMIT 2");

  await conn.end();
  return {
    cityId,
    currentLocationId: childIds[0],
    teachingAreaIds: childIds.slice(0, 3),
    primarySubjectIds: subjectRows.slice(0, 2).map(r => Number(r.id)),
    additionalSubjectIds: subjectRows.slice(2, 3).map(r => Number(r.id)),
    classLevelIds: levelRows.map(r => Number(r.id)),
    curriculumIds: curriculumRows.map(r => Number(r.id)),
    universityId: Number(university.id),
    facultyDepartmentId: departmentId,
    degreeMajorId: degreeMajor ? Number(degreeMajor.id) : undefined,
    studentTypeIds: studentTypeRows.map(r => Number(r.id)),
  };
}

async function findExistingTutorUserId(): Promise<number | null> {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = (await conn.query(
    "SELECT id FROM users WHERE email=? AND role='tutor' LIMIT 1",
    [DEMO.email.toLowerCase()],
  )) as [Array<{ id: number }>, unknown];
  await conn.end();
  return rows[0]?.id ?? null;
}

async function main() {
  const ids = await pickCatalogIds();

  let userId: number;
  let tutorNumber: number | null = null;
  const registered = await registerPasswordTutor({
    name: DEMO.name,
    email: DEMO.email,
    password: DEMO.password,
    confirmPassword: DEMO.password,
    phone: DEMO.phone,
    gender: DEMO.gender,
    cityId: ids.cityId,
    locationId: ids.currentLocationId,
    termsVersion: "demo-seed",
  });

  if (registered.created) {
    userId = registered.user.id;
    tutorNumber = registered.registration.tutorNumber ?? null;
    console.log(`Created demo Tutor account (userId ${userId}, tutorNumber ${tutorNumber}).`);
  } else if (registered.reason === "email") {
    const existing = await findExistingTutorUserId();
    if (!existing) throw new Error("Demo email is taken by a non-Tutor account - change DEMO.email.");
    userId = existing;
    console.log(`Demo Tutor account already exists (userId ${userId}) - re-saving profile.`);
  } else {
    throw new Error(`registerPasswordTutor refused: ${registered.reason}`);
  }

  const draft = {
    name: DEMO.name,
    gender: DEMO.gender,
    dateOfBirth: "1996-05-14",
    headline: "Experienced Mathematics & Physics tutor for SSC and HSC students",
    phone: DEMO.phone,
    contactEmail: DEMO.email,
    currentCityId: ids.cityId,
    currentLocationId: ids.currentLocationId,
    teachingAreaIds: ids.teachingAreaIds,
    availableNationwide: true,
    highestEducation: "Masters" as const,
    universityId: ids.universityId,
    facultyDepartmentId: ids.facultyDepartmentId,
    ...(ids.degreeMajorId ? { degreeMajorId: ids.degreeMajorId } : {}),
    degreeExamTitle: "MSc in Applied Mathematics",
    resultGpa: "3.85",
    deptId: "AMTH-2019",
    studyStatus: "graduated" as const,
    graduationYear: 2019,
    primarySubjectIds: ids.primarySubjectIds,
    additionalSubjectIds: ids.additionalSubjectIds,
    classLevelIds: ids.classLevelIds,
    curriculumIds: ids.curriculumIds,
    // Student Types is gone from the profile UI, but the column and catalog
    // still exist - fill it so this demo profile is genuinely complete.
    studentTypeIds: ids.studentTypeIds,
    teachingExperienceYears: 6,
    priorTeachingExperience: "Two years at a coaching centre in Dhanmondi, then four years of private home tuition for SSC and HSC science students.",
    specialExpertise: "Board exam preparation, MCQ speed technique, and building intuition for physics problem solving.",
    academicAchievement: "Dean's Merit List, University of Dhaka (2018). Champion, Intra-University Math Olympiad 2017.",
    tuitionType: "both" as const,
    preferredStudentGender: "both" as const,
    preferredClassSizes: ["one_to_one", "small_group"],
    preferredTeachingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"],
    preferredTimeSlots: ["morning", "evening", "flexible"],
    feeMin: 4000,
    feeMax: 9000,
    travelDistanceKm: 8,
    aboutMe: "I am a full-time private tutor with six years of experience teaching Mathematics and Physics to SSC and HSC students across Dhaka. My lessons are structured around the board syllabus, with weekly practice sets and monthly mock tests so a student always knows where they stand.",
    teachingApproach: "Concept first, then guided practice, then independent problem solving. I keep a shared error log for every student and revisit weak areas before each exam.",
    whyChooseMe: "Consistent results, clear weekly feedback to guardians, and flexible scheduling for both home and online sessions.",
    additionalNotes: "Available for online sessions nationwide and in-person within 8 km of Dhanmondi. This is a demo profile.",
    privateDetails: {
      additionalPhone: "+8801811111111",
      nationality: "Bangladeshi",
      religion: "Islam",
      socialProfileLinks: "https://facebook.com/demo.tutor",
      fatherName: "Abdul Karim",
      fatherPhone: "+8801711111112",
      motherName: "Rokeya Begum",
      motherPhone: "+8801711111113",
      emergencyContactName: "Sabbir Ahmed",
      emergencyContactRelation: "Brother",
      emergencyContactPhone: "+8801711111114",
      emergencyContactAddress: "House 12, Road 5, Dhanmondi, Dhaka 1205",
    },
    educationRecords: [
      {
        qualificationLevel: "Masters" as const,
        instituteName: "University of Dhaka",
        degreeExamTitle: "MSc in Applied Mathematics",
        majorGroup: "Applied Mathematics",
        resultGpa: "3.85",
        curriculum: "English Version" as const,
        studyStartYear: 2017,
        studyEndYear: 2019,
        currentlyStudying: false,
        instituteIdCardNumber: "DU-2017-AMTH-042",
      },
      {
        qualificationLevel: "HSC" as const,
        instituteName: "Notre Dame College",
        degreeExamTitle: "Higher Secondary Certificate",
        majorGroup: "Science",
        resultGpa: "5.00",
        curriculum: "Bangla Version" as const,
        studyStartYear: 2013,
        studyEndYear: 2015,
        currentlyStudying: false,
        instituteIdCardNumber: "NDC-2013-1187",
      },
    ],
  };

  await saveTutorProfileDraft(userId, draft as never);
  console.log("Saved the structured profile draft (all sections).");

  await saveTutorProfilePhotoKey(userId, "demo/tutor-demo-photo.jpg");
  await saveTutorUniversityIdDocument(userId, "demo/tutor-demo-university-id.jpg");
  for (const type of ["nid_card", "ssc_certificate", "hsc_certificate", "hons_ms_certificate"]) {
    await saveTutorSupportingDocument(userId, type, `demo/tutor-demo-${type}.jpg`);
  }
  console.log("Attached demo photo, University ID document, and 4 supporting documents.");

  try {
    await submitTutorProfile(userId);
    console.log("Submitted the profile for review (status: pending).");
  } catch (error) {
    // Re-running against an already-submitted demo: the draft is re-saved
    // above, only this final step is a no-op.
    if (error instanceof Error && /draft or changes-requested/.test(error.message)) {
      console.log("Profile was already submitted - draft refreshed, nothing else to do.");
    } else {
      throw error;
    }
  }

  console.log("\n--- Demo Tutor ready ---");
  console.log(`  Login page : /tutor/login`);
  console.log(`  Email      : ${DEMO.email}`);
  console.log(`  Password   : ${DEMO.password}`);
  console.log(`  Name       : ${DEMO.name}`);
  if (tutorNumber) console.log(`  Tutor no.  : ${tutorNumber}`);
  console.log(`  Status     : pending (in the Admin matching workspace review queue)`);
}

main().then(
  () => process.exit(0),
  error => {
    console.error("\nseed-demo-tutor failed:");
    console.error(error?.issues ? JSON.stringify(error.issues, null, 2) : error);
    process.exit(1);
  },
);
