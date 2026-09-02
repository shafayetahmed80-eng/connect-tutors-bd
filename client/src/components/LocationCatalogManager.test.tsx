// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCATION_PAGE_SIZE } from "@shared/location-catalog";

type Row = {
  id: string;
  label: string;
  type: string;
  active: boolean;
  origin: string;
  usageCount: number;
  childCount: number;
  path?: string[];
};

const state = vi.hoisted(() => ({
  browseRows: [] as Row[],
  browseTotal: 0,
  trail: [] as Array<{ id: string; label: string }>,
  parentType: null as string | null,
  searchRows: [] as Row[],
  searchTotal: 0,
  browseInput: null as any,
  searchInput: null as any,
  browseEnabled: false,
  searchEnabled: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      locationCatalog: {
        browse: { invalidate: state.invalidate },
        search: { invalidate: state.invalidate },
      },
    }),
    locationCatalog: {
      browse: {
        useQuery: (input: any, options: any) => {
          state.browseInput = input;
          state.browseEnabled = options?.enabled !== false;
          return {
            data: { rows: state.browseRows, total: state.browseTotal, trail: state.trail, parentType: state.parentType },
            isLoading: false, isError: false, isFetching: false,
          };
        },
      },
      search: {
        useQuery: (input: any, options: any) => {
          state.searchInput = input;
          state.searchEnabled = options?.enabled !== false;
          return { data: { rows: state.searchRows, total: state.searchTotal }, isLoading: false, isError: false, isFetching: false };
        },
      },
      create: { useMutation: () => ({ mutateAsync: state.create }) },
      update: { useMutation: () => ({ mutateAsync: state.update }) },
      remove: { useMutation: () => ({ mutateAsync: state.remove }) },
    },
  },
}));

import LocationCatalogManager from "./LocationCatalogManager";

const city: Row = { id: "dhaka-city", label: "Dhaka", type: "city", active: true, origin: "seed", usageCount: 5, childCount: 101 };
const thana: Row = { id: "dhaka-thana-adabar", label: "Adabar", type: "thana", active: true, origin: "seed", usageCount: 1, childCount: 0 };
const added: Row = { id: "new-area", label: "New Area", type: "area", active: true, origin: "admin", usageCount: 0, childCount: 0 };

beforeEach(() => {
  state.browseRows = [city, thana, added];
  state.browseTotal = 3;
  state.trail = [{ id: "bd", label: "Bangladesh" }];
  state.parentType = "country";
  state.searchRows = [];
  state.searchTotal = 0;
  for (const spy of [state.create, state.update, state.remove, state.invalidate]) spy.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("location catalog manager", () => {
  it("opens at the root and does not search until asked to", () => {
    render(<LocationCatalogManager />);
    expect(state.browseInput).toEqual({ parentId: null, query: "", page: 1 });
    expect(state.browseEnabled).toBe(true);
    expect(state.searchEnabled).toBe(false);
  });

  it("descends into a place and asks for what is inside it", () => {
    render(<LocationCatalogManager />);
    fireEvent.click(screen.getByRole("button", { name: "Open Dhaka" }));
    expect(state.browseInput).toMatchObject({ parentId: "dhaka-city", page: 1 });
  });

  it("will not offer to open a place with nothing inside", () => {
    render(<LocationCatalogManager />);
    expect(screen.getByRole("button", { name: "Open Dhaka" })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: "Open Adabar" })).toHaveProperty("disabled", true);
  });

  it("switches to searching the whole tree once typing settles, not per keystroke", () => {
    vi.useFakeTimers();
    render(<LocationCatalogManager />);

    fireEvent.change(screen.getByPlaceholderText("Search every place"), { target: { value: "mirpur" } });
    expect(state.searchEnabled).toBe(false);

    act(() => { vi.advanceTimersByTime(300); });
    expect(state.searchInput).toMatchObject({ query: "mirpur", page: 1 });
    expect(state.searchEnabled).toBe(true);
    // Browsing stops while a search is on, so one list is shown, not two.
    expect(state.browseEnabled).toBe(false);
    vi.useRealTimers();
  });

  it("shows the path to each hit, because a name alone does not say which one it is", () => {
    vi.useFakeTimers();
    state.searchRows = [{ ...added, label: "Bazar", path: ["Bangladesh", "Sylhet"] }];
    state.searchTotal = 1;
    render(<LocationCatalogManager />);
    fireEvent.change(screen.getByPlaceholderText("Search every place"), { target: { value: "bazar" } });
    act(() => { vi.advanceTimersByTime(300); });

    expect(screen.getByText("Bangladesh / Sylhet")).toBeTruthy();
    vi.useRealTimers();
  });

  it("offers to add only inside an open place, and only kinds that fit under it", () => {
    // At the root there is nowhere to add: the country is fixed.
    const { unmount } = render(<LocationCatalogManager />);
    expect(screen.queryByLabelText(/^Add a place inside/)).toBeNull();
    unmount();

    state.trail = [{ id: "bd", label: "Bangladesh" }, { id: "dhaka-city", label: "Dhaka" }];
    state.parentType = "city";
    render(<LocationCatalogManager />);
    fireEvent.click(screen.getByRole("button", { name: "Open Dhaka" }));

    const kinds = Array.from(screen.getByLabelText("Kind of place").querySelectorAll("option")).map(o => o.textContent);
    // A city cannot hold another city or a district - only what sits below it.
    expect(kinds).toEqual(["Upazila", "Thana", "Subdivision", "Area"]);
  });

  it("adds a place under the place currently open", async () => {
    state.trail = [{ id: "bd", label: "Bangladesh" }, { id: "dhaka-city", label: "Dhaka" }];
    state.parentType = "city";
    render(<LocationCatalogManager />);
    fireEvent.click(screen.getByRole("button", { name: "Open Dhaka" }));

    fireEvent.change(screen.getByLabelText("Add a place inside Dhaka"), { target: { value: "Mirpur 10" } });
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));

    await vi.waitFor(() => expect(state.create).toHaveBeenCalledWith({ parentId: "dhaka-city", type: "upazila", label: "Mirpur 10" }));
  });

  it("refuses to delete a built-in place, one in use, or one with places inside", () => {
    render(<LocationCatalogManager />);
    expect(screen.getByRole("button", { name: "Delete Dhaka" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Delete Adabar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Delete New Area" })).toHaveProperty("disabled", false);
  });

  it("counts only the deletable rows in a bulk delete", () => {
    render(<LocationCatalogManager />);
    fireEvent.click(screen.getByLabelText("Select Dhaka"));
    fireEvent.click(screen.getByLabelText("Select New Area"));

    expect(screen.getByText("2 selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Delete 1/ })).toHaveProperty("disabled", false);
  });

  it("saves renames and hides together, one row at a time", async () => {
    render(<LocationCatalogManager />);

    fireEvent.change(screen.getByLabelText("Dhaka"), { target: { value: "Dhaka City" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide New Area" }));
    fireEvent.click(screen.getByRole("button", { name: "Save 2 changes" }));

    await vi.waitFor(() => expect(state.update).toHaveBeenCalledTimes(2));
    expect(state.update).toHaveBeenCalledWith({ id: "dhaka-city", label: "Dhaka City", active: true });
    expect(state.update).toHaveBeenCalledWith({ id: "new-area", label: "New Area", active: false });
  });

  it("drops the selection when another place is opened", () => {
    render(<LocationCatalogManager />);
    fireEvent.click(screen.getByLabelText("Select Dhaka"));
    expect(screen.getByText("1 selected")).toBeTruthy();

    // Row ids belong to the level in view; carrying them into another would act
    // on rows nobody is looking at.
    fireEvent.click(screen.getByRole("button", { name: "Open Dhaka" }));
    expect(screen.queryByText("1 selected")).toBeNull();
  });

  it("pages a level rather than listing all 101 of Dhaka's thanas", () => {
    state.browseTotal = LOCATION_PAGE_SIZE * 5;
    render(<LocationCatalogManager />);

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(state.browseInput).toMatchObject({ page: 2 });
    expect(screen.getByText("Page 2 of 5")).toBeTruthy();
  });

  it("surfaces a rejected save instead of pretending it worked", async () => {
    state.update.mockRejectedValue(new Error('"Adabar" already uses that name here.'));
    render(<LocationCatalogManager />);

    fireEvent.change(screen.getByLabelText("New Area"), { target: { value: "Adabar" } });
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("already uses that name"));
  });
});
