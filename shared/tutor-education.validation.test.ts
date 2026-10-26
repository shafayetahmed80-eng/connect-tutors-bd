import { describe, expect, it } from "vitest";
import { validateEducationTimelineSequence, validateResultGpa, validateEducationTextField, validateEducationExamNumber } from "./tutor-education";

describe("validateResultGpa", () => {
  it("allows empty or undefined results", () => {
    expect(validateResultGpa(null, "SSC")).toBeNull();
    expect(validateResultGpa(undefined, "HSC")).toBeNull();
    expect(validateResultGpa("", "Honours")).toBeNull();
    expect(validateResultGpa("   ", "Masters")).toBeNull();
  });

  it("validates school board exam GPA scale (maximum 5.00)", () => {
    // Valid values
    expect(validateResultGpa("5.00", "SSC")).toBeNull();
    expect(validateResultGpa("5.0", "HSC")).toBeNull();
    expect(validateResultGpa("4.85", "SSC")).toBeNull();
    expect(validateResultGpa("3.50", "HSC")).toBeNull();
    expect(validateResultGpa("1.00", "SSC")).toBeNull();

    // Values exceeding 5.00
    expect(validateResultGpa("5.01", "SSC")).toContain("cannot exceed 5.00");
    expect(validateResultGpa("5.50", "HSC")).toContain("cannot exceed 5.00");
    expect(validateResultGpa("6.0", "SSC")).toContain("cannot exceed 5.00");
    expect(validateResultGpa("10", "HSC")).toContain("cannot exceed 5.00");

    // Values below 1.00
    expect(validateResultGpa("0.5", "SSC")).toContain("must be at least 1.00");
    expect(validateResultGpa("0", "HSC")).toContain("Enter a valid Result/GPA");
  });

  it("validates university degree CGPA scale (maximum 4.00)", () => {
    // Valid values
    expect(validateResultGpa("4.00", "Honours")).toBeNull();
    expect(validateResultGpa("3.92", "Masters")).toBeNull();
    expect(validateResultGpa("3.50", "Honours")).toBeNull();
    expect(validateResultGpa("2.50", "Masters")).toBeNull();
    expect(validateResultGpa("1.00", "Honours")).toBeNull();

    // Values exceeding 4.00
    expect(validateResultGpa("4.01", "Honours")).toContain("cannot exceed 4.00");
    expect(validateResultGpa("4.50", "Masters")).toContain("cannot exceed 4.00");
    expect(validateResultGpa("5.00", "Honours")).toContain("cannot exceed 4.00");
    expect(validateResultGpa("5.00", "Masters")).toContain("cannot exceed 4.00");

    // Values below 1.00
    expect(validateResultGpa("0.8", "Honours")).toContain("must be at least 1.00");
  });

  it("permits standard non-numeric text grades and divisions", () => {
    expect(validateResultGpa("Golden A+", "SSC")).toBeNull();
    expect(validateResultGpa("A+", "HSC")).toBeNull();
    expect(validateResultGpa("A-", "SSC")).toBeNull();
    expect(validateResultGpa("First Class", "Honours")).toBeNull();
    expect(validateResultGpa("2nd Division", "HSC")).toBeNull();
    expect(validateResultGpa("Passed", "SSC")).toBeNull();
    expect(validateResultGpa("Appeared", "Honours")).toBeNull();
  });
});

describe("validateEducationTimelineSequence", () => {
  it("returns null when no records or single record provided", () => {
    expect(validateEducationTimelineSequence([])).toBeNull();
    expect(validateEducationTimelineSequence([{ qualificationLevel: "SSC", passingYear: 2018 }])).toBeNull();
  });

  it("validates that HSC passing year must be strictly later than SSC passing year", () => {
    // Correct chronological sequence
    expect(validateEducationTimelineSequence([
      { qualificationLevel: "SSC", passingYear: 2016 },
      { qualificationLevel: "HSC", passingYear: 2018 },
    ])).toBeNull();

    // Inverted years (HSC before SSC)
    expect(validateEducationTimelineSequence([
      { qualificationLevel: "SSC", passingYear: 2018 },
      { qualificationLevel: "HSC", passingYear: 2016 },
    ])).toContain("HSC passing year (2016) cannot be earlier than SSC passing year (2018)");

    // Same year (e.g. private candidates) is allowed
    expect(validateEducationTimelineSequence([
      { qualificationLevel: "SSC", passingYear: 2018 },
      { qualificationLevel: "HSC", passingYear: 2018 },
    ])).toBeNull();
  });

  it("validates that university graduation year must be strictly later than HSC passing year", () => {
    expect(validateEducationTimelineSequence(
      [
        { qualificationLevel: "SSC", passingYear: 2014 },
        { qualificationLevel: "HSC", passingYear: 2016 },
      ],
      { graduationYear: 2021 },
    )).toBeNull();

    expect(validateEducationTimelineSequence(
      [
        { qualificationLevel: "SSC", passingYear: 2014 },
        { qualificationLevel: "HSC", passingYear: 2016 },
      ],
      { graduationYear: 2015 },
    )).toContain("University graduation year (2015) cannot be earlier than HSC passing year (2016)");
  });

  it("validates Honours completion before Masters start", () => {
    expect(validateEducationTimelineSequence([
      { qualificationLevel: "Honours", studyStartYear: 2016, studyEndYear: 2020 },
      { qualificationLevel: "Masters", studyStartYear: 2021, studyEndYear: 2022 },
    ])).toBeNull();

    expect(validateEducationTimelineSequence([
      { qualificationLevel: "Honours", studyStartYear: 2016, studyEndYear: 2021 },
      { qualificationLevel: "Masters", studyStartYear: 2019, studyEndYear: 2020 },
    ])).toContain("Masters study start year (2019) cannot be earlier than Honours completion year (2021)");
  });
});
describe("validateEducationTextField", () => {
  it("allows null or empty strings", () => {
    expect(validateEducationTextField(null, "Institute Name")).toBeNull();
    expect(validateEducationTextField("", "Degree / Exam Title")).toBeNull();
  });

  it("accepts valid institute names, degrees, and majors", () => {
    expect(validateEducationTextField("Dhaka University", "Institute Name")).toBeNull();
    expect(validateEducationTextField("BSc in Physics", "Degree / Exam Title")).toBeNull();
    expect(validateEducationTextField("Computer Science & Engineering", "Major / Group")).toBeNull();
    expect(validateEducationTextField("ঢাকা কলেজ", "Institute Name")).toBeNull();
  });

  it("rejects strings shorter than 2 characters", () => {
    expect(validateEducationTextField("A", "Institute Name")).toBe("Enter a valid institute name (at least 2 characters).");
  });

  it("rejects punctuation-only strings", () => {
    expect(validateEducationTextField("..", "Institute Name")).toBe("Enter a valid institute name.");
    expect(validateEducationTextField("--", "Degree / Exam Title")).toBe("Enter a valid degree / exam title.");
  });

  it("rejects single repeated characters", () => {
    expect(validateEducationTextField("aaaa", "Institute Name")).toBe("Enter a valid institute name.");
    expect(validateEducationTextField("zzzzzz", "Major / Group")).toBe("Enter a valid major / group.");
  });

  it("rejects placeholder and dummy tokens", () => {
    expect(validateEducationTextField("none", "Institute Name")).toBe("Enter a genuine institute name rather than placeholder text.");
    expect(validateEducationTextField("N/A", "Degree / Exam Title")).toBe("Enter a genuine degree / exam title rather than placeholder text.");
    expect(validateEducationTextField("test", "Major / Group")).toBe("Enter a genuine major / group rather than placeholder text.");
    expect(validateEducationTextField("asdf", "Institute Name")).toBe("Enter a genuine institute name rather than placeholder text.");
  });
});

describe("validateEducationExamNumber", () => {
  it("allows null or empty strings", () => {
    expect(validateEducationExamNumber(null, "Roll Number")).toBeNull();
    expect(validateEducationExamNumber("", "Registration Number")).toBeNull();
  });

  it("accepts genuine roll and registration numbers", () => {
    expect(validateEducationExamNumber("123456", "Roll Number")).toBeNull();
    expect(validateEducationExamNumber("REG-987654", "Registration Number")).toBeNull();
  });

  it("rejects dummy placeholder text", () => {
    expect(validateEducationExamNumber("none", "Roll Number")).toBe("Enter a valid roll number or leave it empty.");
    expect(validateEducationExamNumber("na", "Registration Number")).toBe("Enter a valid registration number or leave it empty.");
  });

  it("rejects single repeated characters", () => {
    expect(validateEducationExamNumber("000000", "Roll Number")).toBe("Enter a valid roll number.");
    expect(validateEducationExamNumber("111111", "Registration Number")).toBe("Enter a valid registration number.");
  });
});
