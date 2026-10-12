// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteContentSlots } from "@shared/site-content";

import { fieldGrid, fieldLabel, requiredMark } from "@/components/journeyField";
import { RequestStage } from "./GuardianRequestJourney";

afterEach(cleanup);

const props = {
  step: 1 as const,
  requestInput: {
    learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 1–5", subjects: ["English"] }] }],
    tuitionType: "package" as const, groupCapacity: "",
    packageDurationMonths: "6", studentCount: "2", studentGender: "" as const, addressDetails: "",
    tuitionCityLocationId: "dhaka", tuitionLocationId: "mirpur-10", daysPerWeek: "4", tutoringTime: "",
    preferredGender: "female" as const, instituteName: "", heardAboutUs: "facebook" as const,
    salaryAmount: "5,000",
  },
  notes: "",
  cities: [{ id: "dhaka", label: "Dhaka" }],
  tuitionLocations: [{ id: "mirpur-10", label: "Mirpur 10" }],
  tuitionCityLabel: "Dhaka",
  tuitionLocationLabel: "Mirpur 10",
  pending: false,
  needsLimits: { maxCurricula: 3, maxClasses: 6, maxSubjectsPerClass: 12 },
  onSetLearningNeeds: vi.fn(), onNeedsNotice: vi.fn(), onSetStudentGender: vi.fn(),
  onSetAddressDetails: vi.fn(), onSetTuitionType: vi.fn(), onSetGroupCapacity: vi.fn(),
  onSetPackageDurationMonths: vi.fn(), onSetStudentCount: vi.fn(), onSetTuitionCity: vi.fn(),
  onSetTuitionLocation: vi.fn(), onSetDays: vi.fn(), onSetTutoringTime: vi.fn(), onSetPreferredGender: vi.fn(), onSetSalaryAmount: vi.fn(),
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

  it("marks a required field with one asterisk, and an optional one with nothing", () => {
    const { container } = render(<RequestStage {...props} step={2} />);
    const marks = Array.from(container.querySelectorAll("label span")).filter(span => span.textContent?.trim() === "*");

    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) expect(mark.className).toBe(requiredMark);
    // Optional stays optional without the word (Owner rule, 2026-09-16).
    expect(container.textContent?.toLowerCase()).not.toContain("(optional)");
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

  describe("Tutoring Time", () => {
    it("is a time box on step 2, reachable by its label and above Additional notes", () => {
      render(<RequestStage {...props} step={2} />);

      // A time input has no ARIA role, so the label is the way to it - which is
      // also what a screen reader user hears.
      const box = screen.getByLabelText(/Tutoring Time/) as HTMLInputElement;
      expect(box.tagName).toBe("INPUT");
      expect(box.type).toBe("time");
      expect(box.closest(`.${CSS.escape("gap-x-6")}`)).not.toBeNull();

      const notes = screen.getByRole("textbox", { name: /Additional notes/ });
      expect(box.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("is optional without saying so: no asterisk on its label and no '(optional)' beside it", () => {
      render(<RequestStage {...props} step={2} />);

      const label = (screen.getByLabelText(/Tutoring Time/) as HTMLInputElement).closest("label")!;
      expect(label.textContent).not.toContain("*");
      expect(label.textContent?.toLowerCase()).not.toContain("(optional)");

      // Not vacuous: a required field in the same step does carry the asterisk.
      const required = (screen.getByRole("spinbutton", { name: /Number of students/ }) as HTMLInputElement).closest("label")!;
      expect(required.textContent).toContain("*");
    });

    it("is not asked on step 1", () => {
      render(<RequestStage {...props} step={1} />);

      expect(screen.queryByLabelText(/Tutoring Time/)).toBeNull();
    });

    it("shows the time held in the request and reports what the Guardian types", () => {
      props.onSetTutoringTime.mockClear();
      const { rerender } = render(<RequestStage {...props} step={2} />);
      const empty = screen.getByLabelText(/Tutoring Time/) as HTMLInputElement;
      expect(empty.value).toBe("");

      fireEvent.change(empty, { target: { value: "16:30" } });
      expect(props.onSetTutoringTime).toHaveBeenCalledTimes(1);
      expect(props.onSetTutoringTime).toHaveBeenCalledWith("16:30");

      // The box is controlled: it reads the value the page holds, as when a
      // saved request or a restored draft fills it in.
      rerender(<RequestStage {...props} step={2} requestInput={{ ...props.requestInput, tutoringTime: "16:30" }} />);
      expect((screen.getByLabelText(/Tutoring Time/) as HTMLInputElement).value).toBe("16:30");
    });
  });

  it("routes every request-step field label through a rewordable site-content slot", () => {
    // Each label resolves through `request-tutor.field.*`, so an Owner can
    // reword any field from Admin > Guardian Profile content without a deploy.
    const slotDefaults = new Set(
      getSiteContentSlots("guardian-profile")
        .filter(slot => slot.id.startsWith("request-tutor.field."))
        .map(slot => slot.defaultText),
    );

    for (const step of [1, 2] as const) {
      const { container, unmount } = render(<RequestStage {...props} step={step} />);
      const labelTexts = Array.from(container.querySelectorAll("label"))
        // The label's wording sits on whichever node carries the shared voice
        // class - the <label> itself (location combobox) or a <span> inside it.
        .map(label => [label as Element, ...Array.from(label.querySelectorAll("*"))]
          .find(node => node.className.toString().includes("text-[13px]")))
        .filter((node): node is Element => Boolean(node))
        .map(node => (node.textContent ?? "").replace(/\s*\*\s*$/, "").replace(/\s*\(optional\)\s*$/, "").trim())
        .filter(Boolean);

      expect(labelTexts.length, `step ${step} has field labels`).toBeGreaterThan(3);
      for (const text of labelTexts) {
        expect(slotDefaults, `step ${step}: "${text}" needs a request-tutor.field.* slot`).toContain(text);
      }
      unmount();
    }
  });

  it("carries the icon inside a box on the same marker as the box's own text", () => {
    // Admin > Input Field Text scales this icon in `em`, against the marker's
    // own font-size - so the class has to be on the icon the box actually
    // renders, not just documented as an intention.
    const { container } = render(<RequestStage {...props} step={1} />);
    const tuitionTypeIcon = container.querySelector("select")!.previousElementSibling!;

    expect(tuitionTypeIcon.className).toContain("input-text-journey");
  });
});
