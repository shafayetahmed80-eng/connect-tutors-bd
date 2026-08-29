import { describe, expect, it } from "vitest";
import { createTutorProfileSectionDraftPayload, tutorProfileSectionDefinitions } from "./TutorProfileSectionDraft";
import { hydrateTutorProfileForm } from "./TutorProfileFormData";

const onboardingFallback = {
  name: "Amina Rahman",
  phone: "+8801516131411",
  contactEmail: "amina@example.com",
  gender: "female" as const,
  locationId: "dhaka-uttara",
};

const baseState = hydrateTutorProfileForm(null, onboardingFallback);

describe("Tutor Profile section draft payloads", () => {
  it("defines the approved default-expanded A–H profile sequence", () => {
    expect(tutorProfileSectionDefinitions.map(section => section.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
    ]);
  });

  it("sends only Section E location, fee, and travel fields when saving that section", () => {
    const payload = createTutorProfileSectionDraftPayload("e", {
      ...baseState,
      headline: "Experienced Mathematics Tutor for SSC Students",
      feeMin: "5000",
      feeMax: "8000",
      travelDistanceKm: "10",
    });

    expect(payload).toEqual({ currentLocationId: "dhaka-uttara", feeMin: 5000, feeMax: 8000, travelDistanceKm: 10 });
    expect(payload).not.toHaveProperty("headline");
    expect(payload).not.toHaveProperty("phone");
  });

  it("keeps the online/nationwide cross-field pair together in the tuition section", () => {
    const payload = createTutorProfileSectionDraftPayload("d", {
      ...baseState,
      tuitionType: "online",
      availableNationwide: true,
      preferredStudentGender: "both",
      preferredClassSizes: ["one_to_one"],
      preferredTeachingDays: ["monday"],
      preferredTimeSlots: ["evening"],
    });

    expect(payload).toMatchObject({ tuitionType: "online", availableNationwide: true });
    expect(payload).not.toHaveProperty("currentLocationId");
  });

  it("isolates private identity fields from family and emergency fields across section saves", () => {
    const payload = createTutorProfileSectionDraftPayload("a", {
      ...baseState,
      privateDetails: {
        presentAddress: "House 7, Uttara",
        permanentAddress: "Rajshahi",
        nationality: "Bangladeshi",
        religion: "Islam",
        fatherName: "Abdul Rahman",
        fatherPhone: "+8801712345678",
        emergencyContactName: "Nusrat Rahman",
      },
    });

    expect(payload.privateDetails).toMatchObject({
      presentAddress: "House 7, Uttara",
      permanentAddress: "Rajshahi",
      nationality: "Bangladeshi",
      religion: "Islam",
    });
    expect(payload.privateDetails).not.toHaveProperty("fatherName");
    expect(payload.privateDetails).not.toHaveProperty("emergencyContactName");
  });

  it("isolates private family fields from identity fields when saving Section B", () => {
    const payload = createTutorProfileSectionDraftPayload("b", {
      ...baseState,
      privateDetails: {
        presentAddress: "House 7, Uttara",
        nationality: "Bangladeshi",
        fatherName: "Abdul Rahman",
        fatherPhone: "+8801712345678",
        emergencyContactName: "Nusrat Rahman",
      },
    });

    expect(payload.privateDetails).toMatchObject({
      fatherName: "Abdul Rahman",
      fatherPhone: "+8801712345678",
      emergencyContactName: "Nusrat Rahman",
    });
    expect(payload.privateDetails).not.toHaveProperty("presentAddress");
    expect(payload.privateDetails).not.toHaveProperty("nationality");
  });
});
