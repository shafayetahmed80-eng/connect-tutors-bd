// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LearningNeedsField, { describeLearningNeedsGap, learningNeedsLimitsFrom } from "./LearningNeedsField";
import type { LearningNeed } from "@shared/learning-needs";

afterEach(cleanup);

const limits = { maxCurricula: 3, maxClasses: 6, maxSubjectsPerClass: 2 };
const bangla: LearningNeed = { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["English"] }] };
const englishVersion: LearningNeed = { category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 6", subjects: [] }] };

/** Opens a chip box and takes the offer with this name. */
function choose(scope: HTMLElement, label: RegExp, option: string) {
  const box = within(scope).getByRole("combobox", { name: label });
  fireEvent.click(box);
  fireEvent.click(within(within(scope).getByRole("listbox")).getByRole("button", { name: option }));
}

describe("LearningNeedsField", () => {
  it("opens a block for each curriculum chosen, in the order chosen, and takes it away with the curriculum", () => {
    const onChange = vi.fn();
    render(<LearningNeedsField value={[bangla]} onChange={onChange} limits={limits} />);

    choose(document.body, /Curriculum \/ category/, "English Version");
    expect(onChange).toHaveBeenLastCalledWith([bangla, { category: "English Version", curriculumType: null, classes: [] }]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Bangla Medium" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("gives each curriculum its own class box, and each class its own subjects", () => {
    render(<LearningNeedsField value={[bangla, englishVersion]} onChange={vi.fn()} limits={limits} />);

    expect(within(screen.getByRole("group", { name: "Bangla Medium" })).getByRole("combobox", { name: /Class \/ level/ })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "English Version" })).getByRole("combobox", { name: /Class \/ level/ })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Subjects for Class 5" })).getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(screen.getByRole("group", { name: "Subjects for Class 6" })).getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("adds a class with no subjects yet, and keeps the subjects of the classes that stay", () => {
    const onChange = vi.fn();
    render(<LearningNeedsField value={[bangla]} onChange={onChange} limits={limits} />);

    choose(screen.getByRole("group", { name: "Bangla Medium" }), /Class \/ level/, "Class 6");

    expect(onChange).toHaveBeenLastCalledWith([
      { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["English"] }, { classCourse: "Class 6", subjects: [] }] },
    ]);
  });

  it("takes no further class once the total across every curriculum is reached", () => {
    const onChange = vi.fn();
    const full: LearningNeed[] = [bangla, { category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 6", subjects: ["English"] }] }];
    render(<LearningNeedsField value={full} onChange={onChange} limits={{ ...limits, maxClasses: 2 }} />);

    // Each curriculum already holds a class and the total is 2: neither box can take another.
    for (const name of ["Bangla Medium", "English Version"]) {
      const group = screen.getByRole("group", { name });
      fireEvent.click(within(group).getByRole("combobox", { name: /Class \/ level/ }));
      fireEvent.click(within(within(group).getByRole("listbox")).getAllByRole("button")[0]);
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it("lets a curriculum take the classes another one leaves unused", () => {
    const onChange = vi.fn();
    render(<LearningNeedsField value={[bangla]} onChange={onChange} limits={{ ...limits, maxClasses: 2 }} />);

    choose(screen.getByRole("group", { name: "Bangla Medium" }), /Class \/ level/, "Class 6");

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("refuses a subject over the class's limit, and says why instead of changing it", () => {
    const onChange = vi.fn();
    const onNotice = vi.fn();
    const two: LearningNeed = { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["English", "Bangla"] }] };
    render(<LearningNeedsField value={[two]} onChange={onChange} limits={limits} onNotice={onNotice} />);

    fireEvent.click(within(screen.getByRole("group", { name: "Subjects for Class 5" })).getByRole("button", { name: "BGS" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith("You can choose up to 2 subjects for each class. Remove one to add another.");
  });

  it("counts a class's subjects against its own limit, in words a screen reader hears", () => {
    render(<LearningNeedsField value={[bangla]} onChange={vi.fn()} limits={limits} />);

    expect(screen.getByRole("status", { name: "1 of 2 subjects selected for Class 5" }).textContent).toBe("1 of 2 selected");
  });

  it("asks for the English Medium type inside that curriculum's block only", () => {
    const onChange = vi.fn();
    const english: LearningNeed = { category: "English Medium", curriculumType: null, classes: [{ classCourse: "Standard 1", subjects: ["English"] }] };
    render(<LearningNeedsField value={[english, bangla]} onChange={onChange} limits={limits} />);

    expect(within(screen.getByRole("group", { name: "Bangla Medium" })).queryByRole("combobox", { name: /Curriculum Type/ })).toBeNull();
    fireEvent.change(within(screen.getByRole("group", { name: "English Medium" })).getByRole("combobox", { name: /Curriculum Type/ }), { target: { value: "Cambridge" } });

    expect(onChange).toHaveBeenLastCalledWith([{ ...english, curriculumType: "Cambridge" }, bangla]);
  });

  it("takes the words it shows from the host, so the Owner's renamed labels reach it", () => {
    render(<LearningNeedsField value={[bangla]} onChange={vi.fn()} limits={limits} labels={{ category: "Medium", classCourse: "Grade", subjects: "Topics" }} />);

    expect(screen.getByRole("combobox", { name: /^Medium/ })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Bangla Medium" })).getByRole("combobox", { name: /^Grade/ })).toBeTruthy();
    expect(screen.getByText(/Topics — Class 5/)).toBeTruthy();
  });

  it("renders a 3-pulse journey-chip-halo indicator on selected subject buttons", () => {
    render(<LearningNeedsField value={[bangla]} onChange={vi.fn()} limits={limits} />);

    const englishButton = within(screen.getByRole("group", { name: "Subjects for Class 5" })).getByRole("button", { name: "English" });
    expect(englishButton.querySelector(".journey-chip-halo")).toBeTruthy();

    const banglaButton = within(screen.getByRole("group", { name: "Subjects for Class 5" })).getByRole("button", { name: "Bangla" });
    expect(banglaButton.querySelector(".journey-chip-halo")).toBeNull();
  });
});

describe("describeLearningNeedsGap", () => {
  it("is null for a complete list, and names the first thing missing otherwise", () => {
    expect(describeLearningNeedsGap([bangla], limits)).toBeNull();
    expect(describeLearningNeedsGap([], limits)).toBe("Choose a curriculum or category to continue.");
    expect(describeLearningNeedsGap([bangla, englishVersion], limits)).toBe("Select at least one subject for Class 6 to continue.");
    expect(describeLearningNeedsGap([{ category: "English Medium", curriculumType: null, classes: bangla.classes }], limits)).toBe("Choose a Curriculum Type for English Medium to continue.");
  });
});

describe("learningNeedsLimitsFrom", () => {
  it("reads the Owner's three numbers, and the shipped ones while those are loading", () => {
    expect(learningNeedsLimitsFrom(undefined)).toEqual({ maxCurricula: 3, maxClasses: 6, maxSubjectsPerClass: 12 });
    expect(learningNeedsLimitsFrom({ "request.curricula": 2, "request.levels": 4, "request.subjects": 5 })).toEqual({ maxCurricula: 2, maxClasses: 4, maxSubjectsPerClass: 5 });
  });
});
