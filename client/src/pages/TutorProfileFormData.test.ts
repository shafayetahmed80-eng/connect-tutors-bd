import { describe, expect, it } from "vitest";
import { createProfileDraftPayload, emptyEducationRecord, getProfileDraftFeedback, hydrateTutorProfileForm } from "./TutorProfileFormData";
import { describeMissingDetails, getTutorProfileCompletionSummary, getTutorProfileSubmissionErrors, tutorProfileCopy } from "./TutorProfileUx";
import { defaultSiteLimits } from "@shared/site-limits";
import { resolveTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";
import { tutorProfileDraftSchema } from "../../../server/tutor-profile.validation";

const onboardingFallback = {
  name: "Browser-only name",
  phone: "+8801911111111",
  contactEmail: "browser@example.com",
  gender: "male" as const,
  locationId: "old-location",
};

const serverProfile = {
  name: "Amina Rahman",
  phone: "+8801516131411",
  contactEmail: "amina@example.com",
  gender: "female" as const,
  currentLocationId: "dhaka-uttara",
  tutorNumber: 1503,
  registeredAt: new Date("2019-07-03T00:00:00.000Z"),
  profileStatus: "draft" as const,
  accountStatus: "active" as const,
  completionPercentage: 22,
  assignedRequestCount: 0,
  teachingAreaIds: ["dhaka-uttara"],
  universityId: null,
  facultyDepartmentId: null,
  degreeMajorId: null,
  profilePhotoUrl: null,
  dateOfBirth: null,
  headline: null,
  highestEducation: null,
  studyStatus: null,
  graduationYear: null,
};

/** `serverProfile` carries no selections, so the preview needs them spelled out. */
const emptySelections = {
  primarySubjectIds: [] as string[],
  classLevelIds: [] as string[],
  curriculumIds: [] as string[],
  teachingExperienceYears: "",
  studentTypeIds: [] as string[],
};

describe("Tutor Profile form hydration", () => {
  it("uses the persistent Tutor profile over an onboarding browser fallback after it arrives", () => {
    expect(hydrateTutorProfileForm(serverProfile, onboardingFallback)).toMatchObject({
      name: "Amina Rahman",
      phone: "+8801516131411",
      contactEmail: "amina@example.com",
      gender: "female",
      currentLocationId: "dhaka-uttara",
      tutorNumber: 1503,
      teachingAreaIds: ["dhaka-uttara"],
    });
  });

  it("uses the onboarding fallback only while no persisted server profile is available", () => {
    expect(hydrateTutorProfileForm(null, onboardingFallback)).toMatchObject({
      name: "Browser-only name",
      phone: "+8801911111111",
      contactEmail: "browser@example.com",
      currentLocationId: "old-location",
    });
  });

  it("builds a TP-05 draft payload without system fields, Tutor ownership fields, or raw photo storage keys", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };
    const payload = createProfileDraftPayload({
      ...state,
      dateOfBirth: "1999-04-12",
      headline: "Experienced Mathematics Tutor for SSC Students",
      universityId: "1",
      facultyDepartmentId: "3",
    });

    expect(payload).toMatchObject({
      name: "Amina Rahman",
      currentLocationId: "dhaka-uttara",
      universityId: 1,
      facultyDepartmentId: 3,
    });
    expect(payload).not.toHaveProperty("tutorId");
    expect(payload).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("profileStatus");
    expect(payload).not.toHaveProperty("profilePhotoKey");
  });

  it("omits unselected optional selector arrays so a partial draft is accepted instead of failing minimum-selection validation", () => {
    const state = {
      ...hydrateTutorProfileForm(serverProfile, onboardingFallback),
      teachingAreaIds: [],
      preferredTeachingDays: [],
      preferredTimeSlots: [],
    };

    const payload = createProfileDraftPayload(state);

    expect(payload).not.toHaveProperty("teachingAreaIds");
    expect(payload).not.toHaveProperty("preferredTeachingDays");
    expect(payload).not.toHaveProperty("preferredTimeSlots");
  });

  it("hydrates persisted Sections D–G preferences and optional biography fields from the private owner DTO", () => {
    const hydrated = hydrateTutorProfileForm({
      ...serverProfile,
      tuitionTypes: ["home", "online"],
      preferredStudentGender: "female",
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: 5000,
      feeMax: 8000,
      travelDistanceKm: 10,
      aboutMe: "I help students build confidence through structured practice.",
      teachingApproach: "I begin with concepts and reinforce them through examples.",
      whyChooseMe: "Clear feedback and patient, focused support.",
      additionalNotes: "Available for online sessions after school.",
    } as any, onboardingFallback) as any;

    expect(hydrated).toMatchObject({
      tuitionTypes: ["home", "online"],
      preferredStudentGender: "female",
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: "5000",
      feeMax: "8000",
      travelDistanceKm: "10",
      aboutMe: "I help students build confidence through structured practice.",
    });
  });

  it("normalizes controlled Sections D–G values for a draft without emitting system-managed fields", () => {
    const state = {
      ...hydrateTutorProfileForm(serverProfile, onboardingFallback),
      tuitionTypes: ["home", "online"],
      preferredStudentGender: "both",
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: "5000",
      feeMax: "8000",
      travelDistanceKm: "10",
      aboutMe: "  Structured, supportive mathematics tuition.  ",
      teachingApproach: "  Concept first, then guided practice.  ",
      whyChooseMe: "  Clear feedback for every learner.  ",
      additionalNotes: "   ",
    } as any;

    const payload = createProfileDraftPayload(state);

    expect(payload).toMatchObject({
      tuitionTypes: ["home", "online"],
      preferredStudentGender: "both",
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: 5000,
      feeMax: 8000,
      travelDistanceKm: 10,
      aboutMe: "Structured, supportive mathematics tuition.",
      teachingApproach: "Concept first, then guided practice.",
      whyChooseMe: "Clear feedback for every learner.",
      additionalNotes: undefined,
    });
    expect(payload).not.toHaveProperty("profileStatus");
    expect(payload).not.toHaveProperty("profilePhotoKey");
  });

  it("provides a clear local fee-range message before an invalid draft is sent", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);

    expect(getProfileDraftFeedback({ ...state, feeMin: "8000", feeMax: "7000" })).toBe(
      "Maximum monthly fee must be greater than or equal to the minimum fee.",
    );
  });

  it("provides English required-field guidance before a Tutor submits an incomplete profile", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);

    expect(getTutorProfileSubmissionErrors({
      ...state,
      profilePhotoUrl: null,
      primarySubjectIds: [],
      classLevelIds: [],
      curriculumIds: [],
      teachingExperienceYears: "",
      studentTypeIds: [],
    })).toMatchObject({
      profilePhotoUrl: "Add a profile photo.",
      dateOfBirth: "Enter your date of birth.",
      headline: "Enter a headline with at least 10 characters.",
      educationRecords: expect.stringContaining("at least one education section"),
      primarySubjectIds: "Select at least one primary subject.",
      feeMin: "Enter a minimum monthly fee.",
    });
  });

  it("does not ask for a detail the Owner has switched off or made optional, and counts it out of the total", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };
    const setting = (fieldId: string, change: { enabled?: number; required?: number }) => ({ fieldId, label: null, section: null, subGroup: null, sortOrder: null, enabled: null, required: null, ...change });
    const config = resolveTutorProfileFieldConfig([setting("classLevelIds", { enabled: 0 }), setting("feeMax", { required: 0 }), setting("tuitionType", { required: 0 })]);

    const asked = getTutorProfileSubmissionErrors(state);
    const askedWithSettings = getTutorProfileSubmissionErrors(state, config);
    expect(asked).toHaveProperty("classLevelIds");
    expect(asked).toHaveProperty("feeMax");
    expect(asked).toHaveProperty("tuitionTypes");
    for (const key of ["classLevelIds", "feeMax", "tuitionTypes"]) expect(askedWithSettings).not.toHaveProperty(key);
    // The rest are still asked for.
    expect(askedWithSettings).toHaveProperty("feeMin");
    expect(askedWithSettings).toHaveProperty("primarySubjectIds");

    expect(getTutorProfileCompletionSummary(state, config).totalRequired).toBe(getTutorProfileCompletionSummary(state).totalRequired - 3);
  });

  it("names the details a submission is missing, in the order they are checked, using the wording the Owner set", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections, feeMin: "", feeMax: "" };
    const names = describeMissingDetails(getTutorProfileSubmissionErrors(state), (registryId, fallback) => registryId === "feeMin" ? "Lowest monthly fee" : fallback);

    expect(names).toEqual(expect.arrayContaining(["Class / Level", "Curriculum", "Lowest monthly fee", "Maximum Monthly Fee"]));
    expect(names.indexOf("Class / Level")).toBeLessThan(names.indexOf("Lowest monthly fee"));
    expect(describeMissingDetails({})).toEqual([]);
  });

  it("uses concise English-only field labels", () => {
    expect(tutorProfileCopy.fields.university).toBe("Institute");
    expect(tutorProfileCopy.fields.primarySubjects).toBe("Primary Subjects");
  });

  it("summarizes unfinished required profile fields for a persistent completion guide", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);

    expect(getTutorProfileCompletionSummary({
      ...state,
      profilePhotoUrl: null,
      primarySubjectIds: [],
      classLevelIds: [],
      curriculumIds: [],
      teachingExperienceYears: "",
      studentTypeIds: [],
    })).toMatchObject({
      completed: false,
      missingCount: expect.any(Number),
      completedCount: expect.any(Number),
      totalRequired: expect.any(Number),
      completionPercentage: expect.any(Number),
      message: expect.stringContaining("required details remaining"),
      firstMissingLabel: "Profile Photo",
    });
  });

  it("counts the University Section as filled in only with the timeline its study status asks for", () => {
    // Nothing else on the Education tab is filled in, so the University Section decides.
    const state = {
      ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections,
      universityId: "1", facultyDepartmentId: "11", degreeExamTitle: "BSc",
    };

    const studying = { ...state, studyStatus: "studying" as const, yearSemester: "", graduationYear: "" };
    expect(getTutorProfileSubmissionErrors(studying)).toHaveProperty("educationRecords");
    expect(getTutorProfileSubmissionErrors({ ...studying, yearSemester: "2nd Year/Semester" })).not.toHaveProperty("educationRecords");

    // Graduated: the mirror image - the graduation year is what completes it, the year/semester is not asked for.
    const graduated = { ...state, studyStatus: "graduated" as const, yearSemester: "", graduationYear: "" };
    expect(getTutorProfileSubmissionErrors(graduated)).toHaveProperty("educationRecords");
    expect(getTutorProfileSubmissionErrors({ ...graduated, graduationYear: "2022" })).not.toHaveProperty("educationRecords");
  });

  it("lets one filled-in section of any kind be enough, and does not count one that is half done", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };
    const school = (level: "SSC" | "HSC", change: Record<string, string> = {}) => ({
      ...emptyEducationRecord(), qualificationLevel: level, instituteName: "Dhaka College", degreeExamTitle: level, majorGroup: "Science",
      curriculum: "Bangla Version" as const, passingYear: "2016", ...change,
    });
    const withRecords = (...records: ReturnType<typeof school>[]) => ({ ...state, educationRecords: records });

    expect(getTutorProfileSubmissionErrors(withRecords())).toHaveProperty("educationRecords");
    // SSC alone is enough - plenty of teachers stopped there.
    expect(getTutorProfileSubmissionErrors(withRecords(school("SSC")))).not.toHaveProperty("educationRecords");
    expect(getTutorProfileSubmissionErrors(withRecords(school("HSC")))).not.toHaveProperty("educationRecords");
    // Started and left half done: not counted...
    expect(getTutorProfileSubmissionErrors(withRecords(school("SSC", { majorGroup: "" })))).toHaveProperty("educationRecords");
    // ...and not held against a Tutor who has a whole one beside it.
    expect(getTutorProfileSubmissionErrors(withRecords(school("SSC", { majorGroup: "" }), school("HSC")))).not.toHaveProperty("educationRecords");
  });

  it("normalizes a saved profile back into editable strings before the next draft payload", () => {
    // The API returns MySQL integers for the study years and omits empty
    // columns entirely. Spreading that straight into form state used to leave
    // numbers and undefined where the inputs expect strings, so the very next
    // payload build - which runs right after a save refetches the profile -
    // threw "value.trim is not a function" and blanked the page.
    const savedProfile = {
      ...serverProfile,
      educationRecords: [{
        qualificationLevel: "Honours",
        instituteName: "University of Dhaka",
        degreeExamTitle: "BSc",
        majorGroup: "Physics",
        curriculum: "English Version",
        studyStartYear: 2020,
        studyEndYear: 2024,
        currentlyStudying: false,
      }],
      privateDetails: { fatherName: "Abdul Karim" },
    } as never;

    const form = hydrateTutorProfileForm(savedProfile, onboardingFallback);
    // Found by level, not position: hydration puts the Secondary and Higher
    // Secondary records first, so the degree is no longer index 0.
    const record = form.educationRecords.find(entry => entry.qualificationLevel === "Honours")!;

    expect(record.studyStartYear).toBe("2020");
    expect(record.studyEndYear).toBe("2024");
    // Columns the server left out come back as empty strings, not undefined.
    expect(record.resultGpa).toBe("");
    expect(record.instituteIdCardNumber).toBe("");
    expect(form.privateDetails.motherName).toBe("");

    expect(() => createProfileDraftPayload(form)).not.toThrow();
    expect(createProfileDraftPayload(form).educationRecords.find(entry => entry.qualificationLevel === "Honours")).toMatchObject({
      studyStartYear: 2020,
      studyEndYear: 2024,
    });
  });

  it("sends a qualification that has an institute but no level without a level, so the draft still saves", () => {
    // A qualification added under "Add another qualification" is optional, so a
    // Tutor may type one box and stop. The level goes as undefined, never "":
    // the server's level list has no empty option and refused the whole save.
    const form = hydrateTutorProfileForm({ ...serverProfile, educationRecords: [] } as never, onboardingFallback);
    form.educationRecords.push({ ...emptyEducationRecord(), instituteName: "University of Oxford" });

    const sent = createProfileDraftPayload(form).educationRecords.find(entry => entry.instituteName === "University of Oxford");
    expect(sent).toBeDefined();
    expect(sent?.qualificationLevel).toBeUndefined();
    expect(tutorProfileDraftSchema.safeParse({ educationRecords: [sent] }).success).toBe(true);
  });

  it("always carries a Secondary and a Higher Secondary record, however the profile was saved", () => {
    // Each has its own section in the Education tab, so the form has to hold
    // exactly one of each even for a profile saved before they existed.
    const form = hydrateTutorProfileForm({ ...serverProfile, educationRecords: [] } as never, onboardingFallback);

    expect(form.educationRecords.map(record => record.qualificationLevel)).toEqual(["SSC", "HSC"]);
  });

  it("counts Education as one required detail while any education section is shown, and as none once the Owner hides them all", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };
    const setting = (fieldId: string) => ({ fieldId, label: null, section: null, subGroup: null, sortOrder: null, enabled: 0, required: null });
    const allHidden = resolveTutorProfileFieldConfig([
      "secondaryRecord", "higherSecondaryRecord", "educationRecords", "universityId", "facultyDepartmentId", "degreeExamTitle", "studyStatus", "yearSemester", "graduationYear",
    ].map(setting));

    const shown = getTutorProfileCompletionSummary(state);
    const hidden = getTutorProfileCompletionSummary(state, allHidden);
    expect(shown.totalRequired).toBe(hidden.totalRequired + 1);
    expect(getTutorProfileSubmissionErrors(state, allHidden)).not.toHaveProperty("educationRecords");
    // Whatever the study status says, Education is still the one unit.
    expect(getTutorProfileCompletionSummary({ ...state, studyStatus: "studying" }).totalRequired).toBe(shown.totalRequired);
  });

  it("asks for Teaching Areas from everyone except a Tutor who offers only online tuition", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections, teachingAreaIds: [] as string[] };

    for (const tuitionTypes of [["home"], ["home", "online"], []]) {
      expect(getTutorProfileSubmissionErrors({ ...state, tuitionTypes })).toHaveProperty("teachingAreaIds", "Select at least one teaching area.");
    }
    expect(getTutorProfileSubmissionErrors({ ...state, tuitionTypes: ["online"] })).not.toHaveProperty("teachingAreaIds");
  });

  it("leaves Teaching Areas out of the required count for an online-only Tutor", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections, studyStatus: "" as const };

    const online = getTutorProfileCompletionSummary({ ...state, tuitionTypes: ["online"] });
    const inPerson = getTutorProfileCompletionSummary({ ...state, tuitionTypes: ["home"] });

    expect(inPerson.totalRequired).toBe(online.totalRequired + 1);
  });

  it("no longer sends Available Nationwide or Preferred Class Size in the draft payload", () => {
    const payload = createProfileDraftPayload(hydrateTutorProfileForm(serverProfile, onboardingFallback));

    expect(payload).not.toHaveProperty("availableNationwide");
    expect(payload).not.toHaveProperty("preferredClassSizes");
  });
});


  it("enforces dynamic minimum character limits on descriptive fields when provided", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };
    const limits = { ...defaultSiteLimits(), "tutor.aboutMeMinChars": 30, "tutor.approachMinChars": 40 };

    // Empty is allowed (optional by default)
    expect(getTutorProfileSubmissionErrors({ ...state, aboutMe: "" }, undefined, limits)).not.toHaveProperty("aboutMe");

    // Too short gets error
    expect(getTutorProfileSubmissionErrors({ ...state, aboutMe: "Too short" }, undefined, limits)).toHaveProperty("aboutMe", "Write at least 30 characters in About Me.");
    expect(getTutorProfileSubmissionErrors({ ...state, teachingApproach: "Too brief" }, undefined, limits)).toHaveProperty("teachingApproach", "Write at least 40 characters in Teaching Approach.");

    // Sufficient length passes
    expect(getTutorProfileSubmissionErrors({
      ...state,
      aboutMe: "I am a dedicated teacher with 5+ years of physics tutoring experience.",
      teachingApproach: "I focus on conceptual clarity and problem solving techniques.",
    }, undefined, limits)).not.toHaveProperty("aboutMe");
  });

  it("flags repetitive or dummy text in introduction fields", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };
    const limits = defaultSiteLimits();

    // Repetitive words in aboutMe
    const repetitiveAboutMe = getTutorProfileSubmissionErrors({
      ...state,
      aboutMe: "tutor tutor tutor tutor tutor tutor tutor tutor tutor tutor",
    }, undefined, limits);
    expect(repetitiveAboutMe).toHaveProperty("aboutMe", "Write a meaningful introduction about your educational background and teaching passion.");

    // Repetitive words in teachingApproach
    const repetitiveApproach = getTutorProfileSubmissionErrors({
      ...state,
      teachingApproach: "good tutor good tutor good tutor good tutor good tutor",
    }, undefined, limits);
    expect(repetitiveApproach).toHaveProperty("teachingApproach", "Explain your teaching methodology, how you plan lessons and help students understand concepts.");

    // Dummy keywords in whyChooseMe
    const dummyWhy = getTutorProfileSubmissionErrors({
      ...state,
      whyChooseMe: "test test test test test test test test test test",
    }, undefined, limits);
    expect(dummyWhy).toHaveProperty("whyChooseMe", "Highlight your key strengths, dedication, and why guardians/students should choose you.");

    // Unrealistic experience vs age
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const dob19 = `${currentYear - 19}-01-01`;
    const expErrors = getTutorProfileSubmissionErrors({
      ...state,
      dateOfBirth: dob19,
      teachingExperienceYears: "10",
    }, undefined, limits);
    expect(expErrors).toHaveProperty("teachingExperienceYears", "At age 19, teaching experience cannot exceed 4 years (tuition experience typically starts from age 15).");

    // Dummy institute in education records
    const dummyEduErrors = getTutorProfileSubmissionErrors({
      ...state,
      educationRecords: [
        { ...emptyEducationRecord(), qualificationLevel: "SSC", instituteName: "none", degreeExamTitle: "SSC", majorGroup: "Science", curriculum: "Bangla Version" as const, passingYear: "2018" },
      ],
    }, undefined, limits);
    expect(dummyEduErrors).toHaveProperty("educationRecords", "Enter a genuine institute name rather than placeholder text.");

    // Dummy prior teaching experience
    const dummyExpErrors = getTutorProfileSubmissionErrors({
      ...state,
      priorTeachingExperience: "test test test demo demo demo",
    } as any, undefined, limits);
    expect(dummyExpErrors).toHaveProperty("priorTeachingExperience", "Provide meaningful details about your prior teaching experience rather than repetitive or placeholder text.");

    // Dummy father and mother names
    const dummyFatherErrors = getTutorProfileSubmissionErrors({
      ...state,
      privateDetails: { ...state.privateDetails, fatherName: "Father" },
    }, undefined, limits);
    expect(dummyFatherErrors).toHaveProperty("privateDetails.fatherName", "Enter a genuine father's name rather than placeholder text.");

    const dummyMotherErrors = getTutorProfileSubmissionErrors({
      ...state,
      privateDetails: { ...state.privateDetails, motherName: "none" },
    }, undefined, limits);
    expect(dummyMotherErrors).toHaveProperty("privateDetails.motherName", "Enter a genuine mother's name rather than placeholder text.");

    // Dummy social profile links
    const dummySocialErrors = getTutorProfileSubmissionErrors({
      ...state,
      privateDetails: { ...state.privateDetails, socialProfileLinks: "test" },
    }, undefined, limits);
    expect(dummySocialErrors).toHaveProperty("privateDetails.socialProfileLinks", "Enter a valid social profile link (e.g. https://facebook.com/username or https://linkedin.com/in/username).");

    // Dummy emergency contact address
    const dummyAddressErrors = getTutorProfileSubmissionErrors({
      ...state,
      privateDetails: { ...state.privateDetails, emergencyContactAddress: "same as above" },
    }, undefined, limits);
    expect(dummyAddressErrors).toHaveProperty("privateDetails.emergencyContactAddress", "Enter a detailed emergency contact address rather than placeholder text.");
  });

  it("enforces dynamic minimum and maximum age requirements on dateOfBirth", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };
    const limits = { ...defaultSiteLimits(), "tutor.minAgeYears": 18, "tutor.maxAgeYears": 75 };
    const now = new Date();
    const currentYear = now.getUTCFullYear();

    // Underage (15 years old)
    const underageDate = `${currentYear - 15}-05-15`;
    expect(getTutorProfileSubmissionErrors({ ...state, dateOfBirth: underageDate }, undefined, limits)).toHaveProperty(
      "dateOfBirth",
      "You must be at least 18 years old to apply as a tutor.",
    );

    // Overage (80 years old)
    const overageDate = `${currentYear - 80}-05-15`;
    expect(getTutorProfileSubmissionErrors({ ...state, dateOfBirth: overageDate }, undefined, limits)).toHaveProperty(
      "dateOfBirth",
      "Tutor age must be 75 years or under.",
    );

    // Valid age (22 years old)
    const validDate = `${currentYear - 22}-05-15`;
    expect(getTutorProfileSubmissionErrors({ ...state, dateOfBirth: validDate }, undefined, limits)).not.toHaveProperty("dateOfBirth");
  });

  it("enforces GPA range constraints and education timeline sequence upon submission", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };

    // Invalid school GPA (> 5.00)
    const invalidSscGpaState = {
      ...state,
      educationRecords: [
        { qualificationLevel: "SSC", passingYear: 2016, instituteName: "School", degreeExamTitle: "SSC", majorGroup: "Science", curriculum: "Bangla Version", resultGpa: "5.50" },
      ],
    };
    expect(getTutorProfileSubmissionErrors(invalidSscGpaState as any)).toHaveProperty(
      "educationRecords",
      "Result/GPA cannot exceed 5.00 for SSC/HSC (max 5.00).",
    );

    // Invalid university CGPA (> 4.00)
    const invalidUniGpaState = {
      ...state,
      resultGpa: "4.50",
    };
    expect(getTutorProfileSubmissionErrors(invalidUniGpaState as any)).toHaveProperty(
      "resultGpa",
      "Result/GPA cannot exceed 4.00 for Honours/Masters (max 4.00).",
    );

    // Inverted school passing years (HSC before SSC)
    const invertedYearsState = {
      ...state,
      educationRecords: [
        { qualificationLevel: "SSC", passingYear: 2018, instituteName: "School", degreeExamTitle: "SSC", majorGroup: "Science", curriculum: "Bangla Version", resultGpa: "5.00" },
        { qualificationLevel: "HSC", passingYear: 2016, instituteName: "College", degreeExamTitle: "HSC", majorGroup: "Science", curriculum: "Bangla Version", resultGpa: "5.00" },
      ],
    };
    expect(getTutorProfileSubmissionErrors(invertedYearsState as any)).toHaveProperty(
      "educationRecords",
      "HSC passing year (2016) cannot be earlier than SSC passing year (2018).",
    );
  });

it("flags family and emergency contact phones that duplicate the tutor's personal mobile number", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const withDuplicateFather = {
      ...state,
      phone: "+8801712345678",
      privateDetails: {
        ...state.privateDetails,
        fatherPhone: "01712-345678", // duplicate
        emergencyContactPhone: "+8801712345678", // duplicate
      },
    };

    const errors = getTutorProfileSubmissionErrors(withDuplicateFather as any);
    expect(errors).toHaveProperty(
      "privateDetails.fatherPhone",
      "Father's phone number cannot be the same as your personal mobile number.",
    );
    expect(errors).toHaveProperty(
      "privateDetails.emergencyContactPhone",
      "Emergency contact phone cannot be the same as your personal mobile number.",
    );
  });


  it("flags short or incomplete permanent address in getTutorProfileSubmissionErrors", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const withShortAddress = {
      ...state,
      privateDetails: {
        ...state.privateDetails,
        permanentAddress: "Dhaka",
      },
    };

    const errors = getTutorProfileSubmissionErrors(withShortAddress as any);
    expect(errors).toHaveProperty(
      "privateDetails.permanentAddress",
      "Enter detailed permanent address (at least 10 characters including Village/Area, Thana, District).",
    );

    const withValidAddress = {
      ...state,
      privateDetails: {
        ...state.privateDetails,
        permanentAddress: "Village Example, Thana Sadar, Rangpur",
      },
    };
    const validErrors = getTutorProfileSubmissionErrors(withValidAddress as any);
    expect(validErrors).not.toHaveProperty("privateDetails.permanentAddress");
  });

  it("flags presentAddress when shorter than 10 characters in getTutorProfileSubmissionErrors", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const withShortAddress = {
      ...state,
      privateDetails: {
        ...state.privateDetails,
        presentAddress: "Dhaka",
      },
    };

    const errors = getTutorProfileSubmissionErrors(withShortAddress as any);
    expect(errors).toHaveProperty(
      "privateDetails.presentAddress",
      "Enter detailed present address (at least 10 characters including House/Road, Area).",
    );

    const withValidAddress = {
      ...state,
      privateDetails: {
        ...state.privateDetails,
        presentAddress: "House 12, Road 5, Mirpur, Dhaka",
      },
    };
    const validErrors = getTutorProfileSubmissionErrors(withValidAddress as any);
    expect(validErrors).not.toHaveProperty("privateDetails.presentAddress");
  });

  it("flags emergencyContactName when matching tutor name or self-reference in getTutorProfileSubmissionErrors", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const withSelfName = {
      ...state,
      name: "Shafayet Ahmed",
      privateDetails: {
        ...state.privateDetails,
        emergencyContactName: "Shafayet Ahmed",
      },
    };

    const errors = getTutorProfileSubmissionErrors(withSelfName as any);
    expect(errors).toHaveProperty(
      "privateDetails.emergencyContactName",
      "Emergency contact cannot be yourself. Enter the name of a family member or trusted person.",
    );

    const withValidContact = {
      ...state,
      name: "Shafayet Ahmed",
      privateDetails: {
        ...state.privateDetails,
        emergencyContactName: "Abdul Karim",
      },
    };
    const validErrors = getTutorProfileSubmissionErrors(withValidContact as any);
    expect(validErrors).not.toHaveProperty("privateDetails.emergencyContactName");
  });

  it("flags emergencyContactRelation when self or dummy keyword in getTutorProfileSubmissionErrors", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const withSelfRelation = {
      ...state,
      privateDetails: {
        ...state.privateDetails,
        emergencyContactRelation: "Self",
      },
    };

    const errors = getTutorProfileSubmissionErrors(withSelfRelation as any);
    expect(errors).toHaveProperty(
      "privateDetails.emergencyContactRelation",
      "Emergency contact relation cannot be self. Specify relationship (e.g. Father, Mother, Brother, Guardian).",
    );

    const withValidRelation = {
      ...state,
      privateDetails: {
        ...state.privateDetails,
        emergencyContactRelation: "Father",
      },
    };
    const validErrors = getTutorProfileSubmissionErrors(withValidRelation as any);
    expect(validErrors).not.toHaveProperty("privateDetails.emergencyContactRelation");
  });

  it("flags headline with repetitive or dummy words in getTutorProfileSubmissionErrors", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const withRepHeadline = {
      ...state,
      headline: "tutor tutor tutor",
    };

    const errors = getTutorProfileSubmissionErrors(withRepHeadline as any);
    expect(errors).toHaveProperty(
      "headline",
      "Provide a meaningful professional headline (mention your subject, target classes, or background, e.g. 'Experienced Mathematics Tutor for SSC & HSC').",
    );

    const withValidHeadline = {
      ...state,
      headline: "Experienced Mathematics Tutor for SSC Students",
    };
    const validErrors = getTutorProfileSubmissionErrors(withValidHeadline as any);
    expect(validErrors).not.toHaveProperty("headline");
  });


  it("flags tuition fee below 1,000 BDT in getTutorProfileSubmissionErrors", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const lowMin = {
      ...state,
      feeMin: "500",
      feeMax: "5000",
    };
    const errorsMin = getTutorProfileSubmissionErrors(lowMin as any);
    expect(errorsMin).toHaveProperty(
      "feeMin",
      "Minimum monthly fee must be at least 1,000 BDT (enter monthly salary, not per-class rate).",
    );

    const lowMax = {
      ...state,
      feeMin: "1000",
      feeMax: "800",
    };
    const errorsMax = getTutorProfileSubmissionErrors(lowMax as any);
    expect(errorsMax).toHaveProperty(
      "feeMax",
      "Maximum monthly fee must be at least 1,000 BDT (enter monthly salary, not per-class rate).",
    );
  });

describe("what an untouched education record sends", () => {
  it("leaves a blank field out rather than sending an empty string", () => {
    // The Education tab always carries a Secondary and a Higher Secondary row.
    // Sent as "", each one failed `min(2)` on three fields and the curriculum
    // enum on a fourth - so every draft save carrying education records was
    // refused, from any section, until both school rows were filled.
    const form = hydrateTutorProfileForm(null, null);
    const [secondary] = createProfileDraftPayload(form).educationRecords;

    expect(secondary.qualificationLevel).toBe("SSC");
    for (const key of ["instituteName", "degreeExamTitle", "majorGroup", "curriculum"] as const) {
      expect(secondary[key], key).toBeUndefined();
    }
  });

  it("saves as a draft with both school rows still empty", () => {
    const form = hydrateTutorProfileForm(null, null);
    const parsed = tutorProfileDraftSchema.safeParse({
      educationRecords: createProfileDraftPayload(form).educationRecords,
    });

    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
  });
});
