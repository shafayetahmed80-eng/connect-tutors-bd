// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterPanelFrame } from "@/components/ListToolbar";
import { EMPTY_JOB_FILTER_OPTIONS, FilterSelect, JobCoreFilterFields, type JobCoreFilters } from "@/components/JobFilterFields";

afterEach(cleanup);

const blank: JobCoreFilters = {
  postedFrom: "", postedTo: "", cityId: "", locationIds: [], tuitionTypes: [], daysPerWeek: [], categories: [], classCourses: [], subjects: [],
  studentGender: "", preferredTutorGender: "", jobId: "",
};

describe("FilterSelect", () => {
  it("is still a labelled drop-down that reads as its label until a choice is made, and says what was chosen", () => {
    const onChange = vi.fn();
    render(<FilterSelect label="City" value="" onChange={onChange} options={[{ id: "dhaka", label: "Dhaka" }]} />);

    const select = screen.getByRole("combobox", { name: "City" }) as HTMLSelectElement;
    expect(select.options[0].textContent).toBe("City");
    fireEvent.change(select, { target: { value: "dhaka" } });
    expect(onChange).toHaveBeenCalledWith("dhaka");
  });

  it("draws its own arrow where a chip box draws one, and takes no tap of its own", () => {
    const { container } = render(<FilterSelect label="City" value="" onChange={() => {}} options={[]} />);

    const select = screen.getByRole("combobox", { name: "City" });
    // The browser's arrow is switched off, so the drawn one is the only one, with room for it on the right.
    expect(select.className).toContain("appearance-none");
    expect(select.className).toContain("pr-9");
    const arrow = container.querySelector("svg");
    expect(arrow?.getAttribute("aria-hidden")).toBe("true");
    expect(arrow?.getAttribute("class")).toContain("pointer-events-none");
    // The chip box keeps its arrow 12px from the edge; so does this.
    expect(arrow?.getAttribute("class")).toContain("right-3");
  });
});

describe("JobCoreFilterFields on a phone", () => {
  const draw = (pairOnPhone?: boolean) => render(<JobCoreFilterFields draft={blank} setDraft={() => {}} options={EMPTY_JOB_FILTER_OPTIONS} showCountry={false} pairOnPhone={pairOnPhone} />);

  it("keeps the Job Board's single column unless a list asks for pairs", () => {
    const { container } = draw();
    expect(container.firstElementChild?.className).not.toContain("max-sm:grid-cols-2");
    expect(container.innerHTML).not.toContain("max-sm:col-span-2");
  });

  it("holds two columns when asked, with the long boxes taking the whole row and the short ones sharing it", () => {
    const { container } = draw(true);
    expect(container.firstElementChild?.className).toContain("max-sm:grid-cols-2");
    // Each long box - the chip lists and the City - is wrapped to span both.
    for (const label of ["Tuition Type", "Tutoring Days Per Week", "Category", "Location", "Class", "Subject"]) {
      const box = screen.getByRole("combobox", { name: label });
      expect(box.closest("div[class*='max-sm:col-span-2']"), label).not.toBeNull();
    }
    expect(screen.getByRole("combobox", { name: "City" }).closest("div[class*='max-sm:col-span-2']")).not.toBeNull();
    // The two dates are bare, so they sit side by side.
    for (const label of ["Posted Date From", "Posted Date To"]) {
      expect(screen.getByLabelText(label).closest("div[class*='max-sm:col-span-2']"), label).toBeNull();
    }
  });
});

describe("FilterPanelFrame on a phone", () => {
  it("keeps Clear and Apply at the foot of the screen while a long panel scrolls", () => {
    render(<FilterPanelFrame id="p" ariaLabel="Filters" total={3} onClose={() => {}} onClear={() => {}} onApply={() => {}}><p>boxes</p></FilterPanelFrame>);

    const bar = screen.getByRole("button", { name: "Apply" }).parentElement;
    expect(bar?.className).toContain("max-sm:sticky");
    expect(bar?.className).toContain("max-sm:bottom-0");
    // Both buttons are in it, and the Close button is not: that one stays at the top.
    expect(bar?.contains(screen.getByRole("button", { name: "Clear" }))).toBe(true);
    expect(bar?.contains(screen.getByRole("button", { name: "Close" }))).toBe(false);
  });
});
