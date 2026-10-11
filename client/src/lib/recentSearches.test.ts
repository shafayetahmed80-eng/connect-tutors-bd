// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearRecentSearches, readRecentSearches, rememberRecentSearch, RECENT_SEARCH_LIMIT, setRecentSearchScope } from "./recentSearches";

beforeEach(() => {
  window.localStorage.clear();
  setRecentSearchScope(null);
});

describe("recent searches", () => {
  it("starts empty and keeps what was searched, newest first", () => {
    expect(readRecentSearches("posted-jobs")).toEqual([]);
    rememberRecentSearch("posted-jobs", "Physics");
    rememberRecentSearch("posted-jobs", "Dhanmondi");
    expect(readRecentSearches("posted-jobs")).toEqual(["Dhanmondi", "Physics"]);
  });

  it("moves a repeated search to the front instead of listing it twice, ignoring case and spacing", () => {
    rememberRecentSearch("p", "Physics");
    rememberRecentSearch("p", "Chemistry");
    rememberRecentSearch("p", "  physics ");
    expect(readRecentSearches("p")).toEqual(["physics", "Chemistry"]);
  });

  it("keeps only the newest few", () => {
    for (let i = 1; i <= RECENT_SEARCH_LIMIT + 3; i += 1) rememberRecentSearch("p", `term ${i}`);
    const kept = readRecentSearches("p");
    expect(kept).toHaveLength(RECENT_SEARCH_LIMIT);
    expect(kept[0]).toBe(`term ${RECENT_SEARCH_LIMIT + 3}`);
  });

  it("ignores a search too short to mean anything, and one far too long", () => {
    rememberRecentSearch("p", " a ");
    rememberRecentSearch("p", "x".repeat(200));
    expect(readRecentSearches("p")).toEqual([]);
  });

  it("keeps each list's history apart", () => {
    rememberRecentSearch("posted-jobs", "Physics");
    expect(readRecentSearches("tutor-profiles")).toEqual([]);
  });

  it("keeps each signed-in Admin's history apart, because searches name people", () => {
    setRecentSearchScope(7);
    rememberRecentSearch("p", "01712345678");
    setRecentSearchScope(8);
    expect(readRecentSearches("p")).toEqual([]);
    setRecentSearchScope(7);
    expect(readRecentSearches("p")).toEqual(["01712345678"]);
  });

  it("forgets everything for one list on Clear", () => {
    rememberRecentSearch("p", "Physics");
    rememberRecentSearch("q", "Maths");
    clearRecentSearches("p");
    expect(readRecentSearches("p")).toEqual([]);
    expect(readRecentSearches("q")).toEqual(["Maths"]);
  });

  it("shrugs off storage that holds something unreadable", () => {
    window.localStorage.setItem("connect-tutors:recent-search:device:p", "{not json");
    expect(readRecentSearches("p")).toEqual([]);
    window.localStorage.setItem("connect-tutors:recent-search:device:p", JSON.stringify([1, "ok", null]));
    expect(readRecentSearches("p")).toEqual(["ok"]);
  });
});
