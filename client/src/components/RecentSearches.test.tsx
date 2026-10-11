// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RecentSearches from "@/components/RecentSearches";
import { readRecentSearches, rememberRecentSearch, setRecentSearchScope } from "@/lib/recentSearches";

beforeEach(() => {
  window.localStorage.clear();
  setRecentSearchScope(null);
});
afterEach(cleanup);

function Box({ page = "posted-jobs" }: { page?: string }) {
  const [query, setQuery] = useState("");
  return <RecentSearches page={page} value={query} onPick={setQuery}>
    <label>
      <span className="sr-only">Search jobs</span>
      <input value={query} onChange={event => setQuery(event.target.value)} />
    </label>
  </RecentSearches>;
}

const box = () => screen.getByRole("textbox", { name: "Search jobs" }) as HTMLInputElement;

describe("RecentSearches", () => {
  it("shows nothing until there is a history to show", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<Box />);
    await user.click(box());
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();
  });

  it("offers the earlier searches when the box is focused, newest first", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    rememberRecentSearch("posted-jobs", "Dhanmondi");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());

    const list = screen.getByRole("list", { name: "Recent searches" });
    // Each search has its own button to pick it and one to forget it; Clear forgets the lot.
    expect(within(list).getAllByRole("button").map(button => button.getAttribute("aria-label") ?? button.textContent)).toEqual([
      "Dhanmondi", "Remove Dhanmondi from recent searches", "Physics", "Remove Physics from recent searches", "Clear",
    ]);
  });

  it("fills the box with a picked search and closes", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());
    await user.click(screen.getByRole("button", { name: "Physics" }));

    expect(box().value).toBe("Physics");
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();
  });

  it("remembers a search on Enter, and on leaving the box, but not on every key", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<><Box /><button type="button">elsewhere</button></>);

    await user.click(box());
    await user.type(box(), "Maths");
    expect(readRecentSearches("posted-jobs")).toEqual([]);

    await user.keyboard("{Enter}");
    expect(readRecentSearches("posted-jobs")).toEqual(["Maths"]);

    await user.clear(box());
    await user.type(box(), "Biology");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(readRecentSearches("posted-jobs")).toEqual(["Biology", "Maths"]);
  });

  it("narrows to the searches that contain what is typed, and hides an exact match", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    rememberRecentSearch("posted-jobs", "Chemistry");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());
    await user.type(box(), "phy");
    const list = screen.getByRole("list", { name: "Recent searches" });
    expect(within(list).queryByRole("button", { name: "Chemistry" })).toBeNull();
    expect(within(list).getByRole("button", { name: "Physics" })).toBeTruthy();

    await user.clear(box());
    await user.type(box(), "Physics");
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();
  });

  it("forgets one search without touching the others, and keeps the box focused", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    rememberRecentSearch("posted-jobs", "Dhanmondi");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());
    await user.click(screen.getByRole("button", { name: "Remove Dhanmondi from recent searches" }));

    expect(readRecentSearches("posted-jobs")).toEqual(["Physics"]);
    expect(screen.queryByRole("button", { name: "Dhanmondi" })).toBeNull();
    expect(screen.getByRole("button", { name: "Physics" })).toBeTruthy();
    expect(document.activeElement).toBe(box());
  });

  it("closes the menu when the last search is forgotten", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());
    await user.click(screen.getByRole("button", { name: "Remove Physics from recent searches" }));

    expect(readRecentSearches("posted-jobs")).toEqual([]);
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();
  });

  it("comes back when the words are edited again after Enter closed it", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());
    await user.type(box(), "xy");
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();

    await user.clear(box());
    await user.type(box(), "ph");
    expect(screen.getByRole("button", { name: "Physics" })).toBeTruthy();
  });

  it("closes on Escape, and Clear forgets the list", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();

    await user.click(box());
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(readRecentSearches("posted-jobs")).toEqual([]);
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();
  });

  it("lets the arrow key move from the box into the suggestions", async () => {
    rememberRecentSearch("posted-jobs", "Physics");
    const user = userEvent.setup({ document: window.document });
    render(<Box />);

    await user.click(box());
    await user.keyboard("{ArrowDown}");

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Physics" }));
  });
});
