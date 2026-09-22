// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPageNumbers, TutorListPager } from "./TutorListPager";

afterEach(() => { cleanup(); window.innerWidth = 1024; });

describe("buildPageNumbers", () => {
  it("shows every page when there are five or fewer", () => {
    expect(buildPageNumbers({ page: 1, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageNumbers({ page: 1, totalPages: 1 })).toEqual([1]);
  });

  it("keeps the strip to the first three, an ellipsis, and the last page near the start", () => {
    expect(buildPageNumbers({ page: 1, totalPages: 22 })).toEqual([1, 2, 3, "ellipsis", 22]);
    expect(buildPageNumbers({ page: 2, totalPages: 22 })).toEqual([1, 2, 3, "ellipsis", 22]);
  });

  it("mirrors the same shape near the end", () => {
    expect(buildPageNumbers({ page: 22, totalPages: 22 })).toEqual([1, "ellipsis", 20, 21, 22]);
  });

  it("centres the current page in the middle", () => {
    expect(buildPageNumbers({ page: 12, totalPages: 22 })).toEqual([1, "ellipsis", 11, 12, 13, "ellipsis", 22]);
  });
});

describe("TutorListPager on a laptop", () => {
  it("draws nothing for one page unless a rows-per-page choice is offered", () => {
    const { container } = render(<TutorListPager page={1} totalPages={1} onPage={vi.fn()} label="Test pages" />);
    expect(container.firstChild).toBeNull();
  });

  it("still offers rows-per-page on a single page, once that control is wired", () => {
    render(<TutorListPager page={1} totalPages={1} onPage={vi.fn()} label="Test pages" pageSize={20} pageSizeOptions={[20, 50, 100]} onPageSize={vi.fn()} />);
    expect(screen.getByLabelText(/rows per page/i)).toBeTruthy();
  });

  it("numbers every page and jumps straight to the one clicked", () => {
    const onPage = vi.fn();
    render(<TutorListPager page={12} totalPages={22} onPage={onPage} label="Test pages" />);

    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to page 22" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to page 12" })).toHaveProperty("ariaCurrent", "page");

    fireEvent.click(screen.getByRole("button", { name: "Go to page 13" }));
    expect(onPage).toHaveBeenCalledWith(13);
  });

  it("steps one page at a time with Previous and Next, and disables at the ends", () => {
    const onPage = vi.fn();
    render(<TutorListPager page={1} totalPages={3} onPage={onPage} label="Test pages" />);

    expect(screen.getByRole("button", { name: /Previous page/i })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: /Next page/i }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("offers the 20/50/100 rows-per-page choice only once all three props are given", () => {
    render(<TutorListPager page={1} totalPages={5} onPage={vi.fn()} label="Test pages" pageSize={20} pageSizeOptions={[20, 50, 100]} onPageSize={vi.fn()} />);
    const select = screen.getByLabelText(/rows per page/i);
    expect(within(select).getAllByRole("option").map(option => option.textContent)).toEqual(["20", "50", "100"]);
  });

  it("shows the X-Y of Z count once a total is given", () => {
    render(<TutorListPager page={2} totalPages={5} onPage={vi.fn()} label="Test pages" pageSize={20} pageSizeOptions={[20, 50, 100]} onPageSize={vi.fn()} totalItems={97} />);
    expect(screen.getByText("21–40 of 97")).toBeTruthy();
  });
});

describe("TutorListPager on a phone", () => {
  it("collapses the numbered strip to one Page X of Y button", () => {
    window.innerWidth = 375;
    render(<TutorListPager page={3} totalPages={22} onPage={vi.fn()} label="Test pages" />);

    expect(screen.queryByRole("button", { name: "Go to page 1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Page 3 of 22" })).toBeTruthy();
  });

  it("opens a sheet to scroll to any page, and confirms only on Done", () => {
    window.innerWidth = 375;
    const onPage = vi.fn();
    render(<TutorListPager page={3} totalPages={22} onPage={onPage} label="Test pages" />);

    fireEvent.click(screen.getByRole("button", { name: "Page 3 of 22" }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("Select page")).toBeTruthy();

    fireEvent.click(within(sheet).getByRole("option", { name: "9" }));
    expect(onPage).not.toHaveBeenCalled();

    fireEvent.click(within(sheet).getByRole("button", { name: "Done" }));
    expect(onPage).toHaveBeenCalledWith(9);
  });
});
