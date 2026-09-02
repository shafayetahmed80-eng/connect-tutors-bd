import { describe, expect, it } from "vitest";
import {
  MAX_SALARY_AMOUNT,
  formatSalaryAmount,
  formatSalaryInput,
  parseSalaryAmount,
  salaryValidationMessage,
  validateSalaryAmount,
} from "./salary-amount";

describe("salary amount", () => {
  it("reads the number however the Guardian writes it", () => {
    // The whole point: a comma or the currency word must not be an error.
    for (const written of ["5000", "5,000", "5,000 Taka", "5000 taka", " 5,000  Taka ", "৳5,000"]) {
      expect(parseSalaryAmount(written), written).toBe(5000);
    }
  });

  it("reads Bangla digits, since the site is written for people who use them", () => {
    expect(parseSalaryAmount("৫০০০")).toBe(5000);
    expect(parseSalaryAmount("৫,০০০ Taka")).toBe(5000);
  });

  it("returns nothing when there is no number in it", () => {
    for (const written of ["", "   ", "Taka", "negotiable", null, undefined]) {
      expect(parseSalaryAmount(written), String(written)).toBeNull();
    }
  });

  it("writes an amount one way everywhere", () => {
    expect(formatSalaryAmount(5000)).toBe("5,000 Taka");
    expect(formatSalaryAmount(500)).toBe("500 Taka");
    expect(formatSalaryAmount(12500)).toBe("12,500 Taka");
  });

  it("says so plainly when an old request has no amount", () => {
    // The two requests made before this change chose "Discuss with
    // coordinator" and carry no number at all.
    expect(formatSalaryAmount(null)).toBe("Not set");
    expect(formatSalaryAmount(undefined)).toBe("Not set");
  });

  it("gives the input the grouped number without the currency word", () => {
    // The word belongs beside the field, not inside it, or it would have to be
    // typed around on every edit.
    expect(formatSalaryInput(5000)).toBe("5,000");
    expect(formatSalaryInput(null)).toBe("");
  });

  it("refuses an empty, zero or oversized amount", () => {
    expect(validateSalaryAmount(null)).toBe("missing");
    expect(validateSalaryAmount(0)).toBe("too-small");
    expect(validateSalaryAmount(-1)).toBe("too-small");
    expect(validateSalaryAmount(MAX_SALARY_AMOUNT + 1)).toBe("too-large");
  });

  it("accepts an ordinary amount", () => {
    expect(validateSalaryAmount(5000)).toBeNull();
    expect(validateSalaryAmount(MAX_SALARY_AMOUNT)).toBeNull();
  });

  it("explains each refusal in words a Guardian can act on", () => {
    expect(salaryValidationMessage("missing")).toMatch(/Enter the monthly salary/);
    expect(salaryValidationMessage("too-large")).toContain("500,000");
  });

  it("survives a round trip through the input and back", () => {
    // Typing, saving, reopening and saving again must not drift.
    const typed = "5,000 Taka";
    const stored = parseSalaryAmount(typed)!;
    const reopened = formatSalaryInput(stored);
    expect(parseSalaryAmount(reopened)).toBe(stored);
  });
});
