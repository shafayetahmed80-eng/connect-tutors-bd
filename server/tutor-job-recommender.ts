import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { tutorJobs, tutorJobInterests, tutors, tutorTeachingAreas, tutorSubjects, tutorClassLevels, tutorTuitionModes, tutorCurricula, subjectsCatalog, classLevels, curricula, locations } from "../drizzle/schema";

export type TutorMatchProfile = {
  tutorId: string;
  gender?: string | null;
  currentCityId?: string | null;
  currentLocationId?: string | null;
  teachingAreaIds: string[];
  subjectNames: string[];
  classLevelNames: string[];
  tuitionTypes: string[];
  curriculaNames: string[];
};

export type PublicTutorJob = {
  id: number;
  publicJobId: string;
  tuitionType: string;
  category: string;
  classCourse: string;
  subjects: string;
  studentCount: number;
  studentGender: string | null;
  preferredTutorGender: string | null;
  daysPerWeek: number | null;
  tutoringTime: string | null;
  budgetAmount: number | null;
  country: string;
  cityLocationId: string | null;
  locationId: string | null;
  locationLabel: string | null;
  notes: string | null;
  directionLabel: string | null;
  publishedAt: Date | string | null;
};

export type RecommendedJobItem = {
  job: PublicTutorJob;
  matchScore: number;
  matchGrade: "perfect" | "high" | "good";
  matchReasons: string[];
  applied: boolean;
};

export type RecommendedJobsOutput = {
  items: RecommendedJobItem[];
  totalMatchingCount: number;
  tutorSummary: {
    locationCount: number;
    subjectCount: number;
    profileApproved: boolean;
  };
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF\s]/g, " ").trim();
}

/**
 * Calculates a match score (0-100) between a published tuition job and a tutor's profile.
 * Breakdown:
 * - Location: Up to 35 points
 * - Subjects: Up to 30 points
 * - Class / Category: Up to 20 points
 * - Gender & Mode: Up to 15 points
 */
export function scoreJobForTutor(job: PublicTutorJob, tutor: TutorMatchProfile): {
  score: number;
  grade: "perfect" | "high" | "good";
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // If guardian strictly specified opposite gender, do not recommend
  if (job.preferredTutorGender && job.preferredTutorGender !== "any" && tutor.gender) {
    if (job.preferredTutorGender.toLowerCase() !== tutor.gender.toLowerCase()) {
      return { score: 0, grade: "good", reasons: [] };
    }
  }

  // 1. Location match (Max 35 points)
  const jobLocId = (job.locationId ?? "").trim().toLowerCase();
  const jobCityId = (job.cityLocationId ?? "").trim().toLowerCase();
  const tutorAreaIds = tutor.teachingAreaIds.map(id => id.trim().toLowerCase());
  const tutorCurrentLoc = (tutor.currentLocationId ?? "").trim().toLowerCase();
  const tutorCity = (tutor.currentCityId ?? "").trim().toLowerCase();

  const isExactLocationMatch =
    (jobLocId && (tutorAreaIds.includes(jobLocId) || tutorCurrentLoc === jobLocId));

  if (isExactLocationMatch) {
    score += 35;
    reasons.push("📍 পছন্দের এলাকা");
  } else if (jobCityId && tutorCity && jobCityId === tutorCity) {
    score += 22;
    reasons.push("📍 একই শহর");
  }

  // 2. Subject match (Max 30 points)
  const jobSubjectsRaw = (job.subjects ?? "").split(/[,;/+&|and]+/i).map(s => s.trim().toLowerCase()).filter(Boolean);
  const tutorSubjectsNormalized = tutor.subjectNames.map(s => s.trim().toLowerCase());

  if (jobSubjectsRaw.length > 0 && tutorSubjectsNormalized.length > 0) {
    const matchedCount = jobSubjectsRaw.filter(jobSub =>
      tutorSubjectsNormalized.some(tutorSub => tutorSub.includes(jobSub) || jobSub.includes(tutorSub))
    ).length;

    if (matchedCount >= jobSubjectsRaw.length) {
      score += 30;
      reasons.push("📚 সব বিষয় মিলেছে");
    } else if (matchedCount > 0) {
      score += 18;
      reasons.push("📚 বিষয় মিলেছে");
    }
  }

  // 3. Class level & Category match (Max 20 points)
  const jobClassNormalized = normalizeText(job.classCourse ?? "");
  const tutorLevelsNormalized = tutor.classLevelNames.map(normalizeText);

  const isClassMatch = tutorLevelsNormalized.some(lvl =>
    lvl && (jobClassNormalized.includes(lvl) || lvl.includes(jobClassNormalized))
  );

  if (isClassMatch) {
    score += 15;
    reasons.push("🎓 শ্রেণি মিলেছে");
  }

  const jobCategory = (job.category ?? "").trim().toLowerCase();
  const tutorCurriculaNormalized = tutor.curriculaNames.map(c => c.trim().toLowerCase());
  if (jobCategory && tutorCurriculaNormalized.some(c => jobCategory.includes(c) || c.includes(jobCategory))) {
    score += 5;
    reasons.push("🏷️ কারিকুলাম মিলেছে");
  }

  // 4. Gender & Tuition Mode match (Max 15 points)
  if (job.preferredTutorGender) {
    if (job.preferredTutorGender === "any") {
      score += 8;
    } else if (tutor.gender && job.preferredTutorGender.toLowerCase() === tutor.gender.toLowerCase()) {
      score += 8;
      reasons.push("👥 অভিভাবকের পছন্দের জেন্ডার");
    }
  } else {
    score += 8;
  }

  const jobMode = (job.tuitionType ?? "").toLowerCase();
  const tutorModes = tutor.tuitionTypes.map(m => m.toLowerCase());
  if (jobMode && (tutorModes.includes(jobMode) || jobMode === "both" || tutorModes.includes("both"))) {
    score += 7;
    reasons.push("🏠 টিউশন মাধ্যম");
  }

  const finalScore = Math.min(100, Math.max(0, score));
  let grade: "perfect" | "high" | "good" = "good";
  if (finalScore >= 85) grade = "perfect";
  else if (finalScore >= 70) grade = "high";

  return {
    score: finalScore,
    grade,
    reasons,
  };
}

/**
 * Loads a tutor's match profile and compares against published active jobs.
 */
export async function getRecommendedJobsForTutor(userId: number, limit = 3): Promise<RecommendedJobsOutput> {
  const database = await getDb();
  if (!database) throw new Error("Database is unavailable");

  // 1. Fetch tutor record
  const [tutorRow] = await database
    .select({
      id: tutors.id,
      gender: tutors.gender,
      cityLocationId: tutors.cityLocationId,
      locationId: tutors.locationId,
      profileStatus: tutors.profileStatus,
    })
    .from(tutors)
    .where(eq(tutors.userId, userId))
    .limit(1);

  if (!tutorRow) {
    return {
      items: [],
      totalMatchingCount: 0,
      tutorSummary: { locationCount: 0, subjectCount: 0, profileApproved: false },
    };
  }

  const tutorId = tutorRow.id;

  // 2. Fetch tutor's relational selections
  const [teachingAreas, subjects, classLevelsRows, tuitionModes, curriculaRows, appliedRows] = await Promise.all([
    database.select({ locationId: tutorTeachingAreas.locationId }).from(tutorTeachingAreas).where(eq(tutorTeachingAreas.tutorId, tutorId)),
    database
      .select({ name: subjectsCatalog.name })
      .from(tutorSubjects)
      .innerJoin(subjectsCatalog, eq(tutorSubjects.subjectId, subjectsCatalog.id))
      .where(eq(tutorSubjects.tutorId, tutorId)),
    database
      .select({ name: classLevels.name })
      .from(tutorClassLevels)
      .innerJoin(classLevels, eq(tutorClassLevels.classLevelId, classLevels.id))
      .where(eq(tutorClassLevels.tutorId, tutorId)),
    database.select({ mode: tutorTuitionModes.mode }).from(tutorTuitionModes).where(eq(tutorTuitionModes.tutorId, tutorId)),
    database
      .select({ name: curricula.name })
      .from(tutorCurricula)
      .innerJoin(curricula, eq(tutorCurricula.curriculumId, curricula.id))
      .where(eq(tutorCurricula.tutorId, tutorId)),
    database
      .select({ tutorJobId: tutorJobInterests.tutorJobId })
      .from(tutorJobInterests)
      .where(eq(tutorJobInterests.tutorId, tutorId)),
  ]);

  const appliedJobIds = new Set(appliedRows.map((r: { tutorJobId: number }) => r.tutorJobId));

  const matchProfile: TutorMatchProfile = {
    tutorId,
    gender: tutorRow.gender,
    currentCityId: tutorRow.cityLocationId,
    currentLocationId: tutorRow.locationId,
    teachingAreaIds: teachingAreas.map((a: { locationId: string }) => a.locationId),
    subjectNames: subjects.map((s: { name: string }) => s.name),
    classLevelNames: classLevelsRows.map((c: { name: string }) => c.name),
    tuitionTypes: tuitionModes.map((m: { mode: string }) => m.mode),
    curriculaNames: curriculaRows.map((c: { name: string }) => c.name),
  };

  // 3. Fetch published jobs (up to 100 recent active jobs for matching calculation)
  const publishedJobRows = await database
    .select({
      id: tutorJobs.id,
      publicJobId: tutorJobs.publicJobId,
      tuitionType: tutorJobs.tuitionType,
      category: tutorJobs.category,
      classCourse: tutorJobs.classCourse,
      subjects: tutorJobs.subjects,
      studentCount: tutorJobs.studentCount,
      studentGender: tutorJobs.studentGender,
      preferredTutorGender: tutorJobs.preferredTutorGender,
      daysPerWeek: tutorJobs.daysPerWeek,
      tutoringTime: tutorJobs.tutoringTime,
      budgetAmount: tutorJobs.budgetAmount,
      country: tutorJobs.country,
      cityLocationId: tutorJobs.cityLocationId,
      locationId: tutorJobs.locationId,
      locationLabel: tutorJobs.locationLabel,
      notes: tutorJobs.notes,
      directionLabel: tutorJobs.directionLabel,
      publishedAt: tutorJobs.publishedAt,
    })
    .from(tutorJobs)
    .where(eq(tutorJobs.publicationStatus, "published"))
    .orderBy(desc(tutorJobs.publishedAt), desc(tutorJobs.id))
    .limit(100);

  // 4. Calculate scores for all published jobs
  const scoredItems: RecommendedJobItem[] = [];

  for (const row of publishedJobRows) {
    const jobItem: PublicTutorJob = {
      ...row,
      studentCount: row.studentCount ?? 1,
      country: row.country ?? "Bangladesh",
    };

    const evaluation = scoreJobForTutor(jobItem, matchProfile);

    // Only recommend if matchScore >= 45
    if (evaluation.score >= 45) {
      scoredItems.push({
        job: jobItem,
        matchScore: evaluation.score,
        matchGrade: evaluation.grade,
        matchReasons: evaluation.reasons,
        applied: appliedJobIds.has(jobItem.id),
      });
    }
  }

  // Sort by match score descending, then by newest
  scoredItems.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const dateA = a.job.publishedAt ? new Date(a.job.publishedAt).getTime() : 0;
    const dateB = b.job.publishedAt ? new Date(b.job.publishedAt).getTime() : 0;
    return dateB - dateA;
  });

  return {
    items: scoredItems.slice(0, limit),
    totalMatchingCount: scoredItems.length,
    tutorSummary: {
      locationCount: matchProfile.teachingAreaIds.length,
      subjectCount: matchProfile.subjectNames.length,
      profileApproved: tutorRow.profileStatus === "approved",
    },
  };
}
