// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fieldGrid, fieldLabel, optionalMark, requiredMark } from "@/components/journeyField";
import { RequestStage } from "./GuardianRequestJourney";

afterEach(cleanup);

const props = {
  step: 1 as const,
  requestInput: {
    category: "English Medium", curriculumType: "Cambridge", classCourse: "Class 1–5",
    selectedSubjects: ["English"], tuitionType: "package" as const, groupCapacity: "",
    packageDurationMonths: "6", studentCount: "2", studentGender: "" as const, addressDetails: "",
    tuitionCityLocationId: "dhaka", tuitionLocationId: "mirpur-10", daysPerWeek: "4",
    preferredGender: "female" as const, instituteName: "", heardAboutUs: "facebook" as const,
    salaryAmount: "5,000",
  },
  notes: "",
  cities: [{ id: "dhaka", label: "Dhaka" }],
  tuitionLocations: [{ id: "mirpur-10", label: "Mirpur 10" }],
  tuitionCityLabel: "Dhaka",
  tuitionLocationLabel: "Mirpur 10",
  pending: false,
  subjectLimit: 12,
  onSetCategory: vi.fn(), onSetCurriculumType: vi.fn(), onSetClassCourse: vi.fn(), onSetStudentGender: vi.fn(),
  onSetAddressDetails: vi.fn(), onToggleSubject: vi.fn(), onSetTuitionType: vi.fn(), onSetGroupCapacity: vi.fn(),
  onSetPackageDurationMonths: vi.fn(), onSetStudentCount: vi.fn(), onSetTuitionCity: vi.fn(),
  onSetTuitionLocation: vi.fn(), onSetDays: vi.fn(), onSetPreferredGender: vi.fn(), onSetSalaryAmount: vi.fn(),
  onSetInstituteName: vi.fn(), onSetHeardAboutUs: vi.fn(), onSetNotes: vi.fn(), onBack: vi.fn(),
  onAdvance: vi.fn(), onSubmit: vi.fn(), onEditStep: vi.fn(),
};

/** Every control a Guardian types into or picks from, in the rendered step. */
function fields(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"))
    .filter(control => !control.className.includes("sr-only") && control.type !== "hidden");
}

describe("the Guardian request form's fields line up", () => {
  it("gives every field the same label voice, on both steps", () => {
    for (const step of [1, 2] as const) {
      const { container, unmount } = render(<RequestStage {...props} step={step} />);
      const labels = Array.from(container.querySelectorAll("label"));
      expect(labels.length, `step ${step} has fields`).toBeGreaterThan(3);

      for (const label of labels) {
        // The voice may sit on the label itself (the location combobox) or on
        // the span holding its text (every other field) - one of them carries
        // it, and none of them shouts.
        const classes = [label as Element, ...Array.from(label.querySelectorAll("*"))].map(node => node.className.toString());
        const where = `step ${step}: ${label.textContent?.slice(0, 40)}`;
        expect(classes.some(name => name.includes("text-[13px]") && name.includes("font-semibold")), where).toBe(true);
        // The loud 14px/extrabold labels the request steps used to write by hand.
        expect(classes.some(name => name.includes("font-extrabold")), where).toBe(false);
      }
      unmount();
    }
  });

  it("marks required and optional the same way everywhere", () => {
    const { container } = render(<RequestStage {...props} step={2} />);
    const marks = Array.from(container.querySelectorAll("label span"))
      .filter(span => span.textContent?.trim() === "*" || span.textContent?.trim() === "(optional)");

    expect(marks.length).toBeGreaterThan(3);
    for (const mark of marks) {
      const expected = mark.textContent?.trim() === "*" ? requiredMark : optionalMark;
      expect(mark.className, mark.textContent ?? "").toBe(expected);
    }
    // "(if applicable)" was the location picker's own word for the same idea.
    expect(container.textContent).not.toContain("(if applicable)");
  });

  it("lays every field out as one grid cell, with no hand-set widths", () => {
    for (const step of [1, 2] as const) {
      const { container, unmount } = render(<RequestStage {...props} step={step} />);

      // The salary box was max-w-xs under a max-w-sm student count under a
      // half-width dropdown - three widths down one column.
      expect(container.innerHTML, `step ${step}`).not.toContain("max-w-sm");
      expect(container.innerHTML, `step ${step}`).not.toContain("max-w-xs");

      for (const control of fields(container)) {
        // Chips and the step tracker are not fields; every real field sits
        // inside the shared grid.
        if (control.closest("[aria-label='Subject selection']")) continue;
        expect(control.closest(`.${CSS.escape("gap-x-6")}`), `step ${step}: ${control.getAttribute("id") ?? control.tagName}`).not.toBeNull();
      }
      unmount();
    }
  });

  it("runs both steps on one grid definition", () => {
    expect(fieldGrid).toContain("sm:grid-cols-2");
    expect(fieldLabel).toContain("text-[13px]");

    for (const step of [1, 2] as const) {
      const { container, unmount } = render(<RequestStage {...props} step={step} />);
      const grids = Array.from(container.querySelectorAll("div")).filter(node => node.className === fieldGrid);
      expect(grids.length, `step ${step} lays out on one grid`).toBe(1);
      unmount();
    }
  });

  it("keeps the fields a Guardian must answer reachable by name", () => {
    render(<RequestStage {...props} step={2} />);

    expect(screen.getByRole("spinbutton", { name: /Number of students/ })).not.toBeNull();
    expect(screen.getByRole("spinbutton", { name: /Package duration/ })).not.toBeNull();
    expect(screen.getByRole("textbox", { name: /Monthly salary/ })).not.toBeNull();
    expect(screen.getByRole("textbox", { name: /Additional notes/ })).not.toBeNull();
  });
});
