import { describe, expect, it } from "vitest";
import {
  EXPRESS_POPULAR_CLASSES,
  buildExpressRequestTelegramMessage,
  buildExpressRequestTitle,
  expressTutorRequestInputSchema,
  normalizeExpressRequestPhone,
} from "./express-tutor-request";

describe("expressTutorRequestInputSchema", () => {
  it("accepts a valid express request with minimal fields", () => {
    const valid = {
      phone: "01712345678",
      classCourse: "Class 9-10 (SSC)",
      locationLabel: "Dhanmondi, Dhaka",
    };
    const parsed = expressTutorRequestInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.curriculumType).toBe("Bangla Medium");
      expect(parsed.data.subjects).toBe("All Subjects");
      expect(parsed.data.tuitionType).toBe("home");
      expect(parsed.data.source).toBe("home_hero");
    }
  });

  it("accepts bangla digits and formatted phone", () => {
    const valid = {
      phone: "+880 1812-345678",
      classCourse: "HSC (Science)",
      locationLabel: "Uttara, Dhaka",
      curriculumType: "Bangla Medium",
      subjects: "Physics, Chemistry",
    };
    const parsed = expressTutorRequestInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid phone number", () => {
    const invalid = {
      phone: "12345",
      classCourse: "Class 9",
      locationLabel: "Mirpur",
    };
    const parsed = expressTutorRequestInputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects empty classCourse or empty location", () => {
    const emptyClass = {
      phone: "01712345678",
      classCourse: "",
      locationLabel: "Mirpur",
    };
    expect(expressTutorRequestInputSchema.safeParse(emptyClass).success).toBe(false);

    const emptyLoc = {
      phone: "01712345678",
      classCourse: "Class 9",
      locationLabel: "M",
    };
    expect(expressTutorRequestInputSchema.safeParse(emptyLoc).success).toBe(false);
  });
});

describe("normalizeExpressRequestPhone", () => {
  it("normalizes diverse phone inputs into 01XXXXXXXXX", () => {
    expect(normalizeExpressRequestPhone("+8801712345678")).toBe("01712345678");
    expect(normalizeExpressRequestPhone("01812-345678")).toBe("01812345678");
    expect(normalizeExpressRequestPhone("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
  });
});

describe("buildExpressRequestTitle and telegram message", () => {
  it("constructs proper operational title", () => {
    expect(
      buildExpressRequestTitle({
        classCourse: "Class 9",
        locationLabel: "Dhanmondi, Dhaka",
        curriculumType: "Bangla Medium",
      })
    ).toBe("Need Class 9 Tutor in Dhanmondi, Dhaka");

    expect(
      buildExpressRequestTitle({
        classCourse: "Class 10",
        locationLabel: "Gulshan",
        curriculumType: "English Version",
      })
    ).toBe("Need Class 10 (English Version) Tutor in Gulshan");
  });

  it("formats telegram alert string with all details", () => {
    const msg = buildExpressRequestTelegramMessage({
      id: 105,
      phone: "01712345678",
      guardianName: "Mrs. Rahim",
      classCourse: "Class 9",
      curriculumType: "English Version",
      subjects: "Math, Physics",
      tuitionType: "home",
      locationLabel: "Uttara Sector 4",
      source: "home_hero",
      notes: "Need female tutor preferably from BUET or DU.",
    });

    expect(msg).toContain("New Express Tutor Request");
    expect(msg).toContain("Lead #105");
    expect(msg).toContain("01712345678");
    expect(msg).toContain("Mrs. Rahim");
    expect(msg).toContain("Class 9 (English Version)");
    expect(msg).toContain("Math, Physics");
    expect(msg).toContain("Uttara Sector 4");
    expect(msg).toContain("BUET or DU");
  });

  it("checks popular class presets structure", () => {
    expect(EXPRESS_POPULAR_CLASSES.length).toBeGreaterThan(5);
    expect(EXPRESS_POPULAR_CLASSES[0]).toHaveProperty("id");
    expect(EXPRESS_POPULAR_CLASSES[0]).toHaveProperty("label");
  });
});
