// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { LabelIcon, labelIconName, RecordIcon, recordIcon, type RecordIconName } from "./recordIcons";
import { buildGuardianRequestSummary } from "@/pages/guardian-request-summary";

afterEach(cleanup);

const emptyRequest = {
  category: "Bangla Medium", curriculumType: "", classCourse: "Class 9–10",
  selectedSubjects: ["Mathematics"], tuitionType: "home", groupCapacity: "",
  packageDurationMonths: "", studentCount: "1", studentGender: "", addressDetails: "",
  daysPerWeek: "3", preferredGender: "any", salaryAmount: "5000",
  instituteName: "", heardAboutUs: "facebook",
};

describe("recordIcons vocabulary", () => {
  it("names an icon for every row the Guardian summary can build", () => {
    const rows = buildGuardianRequestSummary(emptyRequest, "", "Dhaka", "Mirpur 10").flatMap(g => g.rows);
    const unnamed = rows.map(r => r.label).filter(label => labelIconName(label) === null);

    expect(rows.length).toBeGreaterThan(10);
    expect(unnamed).toEqual([]);
  });

  it("points every entry at an icon that renders", () => {
    // An entry naming an icon that does not exist would draw nothing, and a
    // silently empty label is exactly what this file is here to prevent.
    // lucide exports forwardRef objects rather than plain functions, so the
    // check is whether it renders, not what shape it is.
    const unrendered = Object.keys(recordIcon).filter(name => {
      const { container, unmount } = render(<RecordIcon name={name as RecordIconName} />);
      const drew = Boolean(container.querySelector("svg"));
      unmount();
      return !drew;
    });
    expect(Object.keys(recordIcon).length).toBeGreaterThan(30);
    expect(unrendered).toEqual([]);
  });

  it("draws nothing rather than a meaningless mark for a label it does not know", () => {
    const { container } = render(<LabelIcon label="Some label nobody mapped" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("hides the icon from a screen reader, which already has the label", () => {
    render(<LabelIcon label="Salary" />);
    const svg = document.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("gives one label one icon across the records that share a word", () => {
    // Salary means the same thing on a job card, in the Guardian summary and on
    // a Tutor's fee row; it must not pick a different mark in each.
    expect(labelIconName("Salary")).toBe("salary");
    expect(labelIconName("Minimum monthly fee")).toBe("salary");
    expect(labelIconName("Maximum monthly fee")).toBe("salary");
    expect(labelIconName("Location")).toBe("location");
    expect(labelIconName("Present address")).toBe("address");
  });
});
