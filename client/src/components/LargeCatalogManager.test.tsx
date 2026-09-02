// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LARGE_CATALOG_PAGE_SIZE } from "@shared/option-catalogs";

const state = vi.hoisted(() => ({
  rows: [] as Array<{ id: number; name: string; active: boolean; origin: string; usageCount: number }>,
  total: 0,
  isFetching: false,
  lastInput: null as any,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ optionCatalogs: { searchLarge: { invalidate: state.invalidate } } }),
    optionCatalogs: {
      searchLarge: {
        useQuery: (input: unknown) => {
          state.lastInput = input;
          return { data: { rows: state.rows, total: state.total }, isLoading: false, isError: false, isFetching: state.isFetching };
        },
      },
      createLarge: { useMutation: () => ({ mutateAsync: state.create }) },
      updateLarge: { useMutation: () => ({ mutateAsync: state.update }) },
      removeLarge: { useMutation: () => ({ mutateAsync: state.remove }) },
    },
  },
}));

import LargeCatalogManager from "./LargeCatalogManager";

const seedRow = { id: 1, name: "University of Dhaka", active: true, origin: "seed", usageCount: 0 };
const usedRow = { id: 2, name: "Sylhet Agricultural University", active: true, origin: "seed", usageCount: 1 };
const adminRow = { id: 3, name: "New Private College", active: true, origin: "admin", usageCount: 0 };

beforeEach(() => {
  state.rows = [seedRow, usedRow, adminRow];
  state.total = 3;
  state.isFetching = false;
  for (const spy of [state.create, state.update, state.remove, state.invalidate]) spy.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("large catalog manager", () => {
  it("asks the server for the first page of institutes", () => {
    render(<LargeCatalogManager />);
    expect(state.lastInput).toEqual({ catalog: "institutes", query: "", page: 1 });
  });

  it("waits for typing to settle before searching, rather than querying per keystroke", () => {
    vi.useFakeTimers();
    render(<LargeCatalogManager />);

    fireEvent.change(screen.getByPlaceholderText("Search institutes"), { target: { value: "medical" } });
    expect(state.lastInput).toMatchObject({ query: "" });

    // The timer fires inside act so the re-render it causes is flushed too.
    act(() => { vi.advanceTimersByTime(300); });
    expect(state.lastInput).toMatchObject({ query: "medical", page: 1 });
    vi.useRealTimers();
  });

  it("offers no reordering, because dragging through hundreds of rows is not a way to arrange them", () => {
    render(<LargeCatalogManager />);
    expect(screen.queryByRole("button", { name: /Move .* up/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Move .* down/ })).toBeNull();
  });

  it("pages only when there is more than one page, and asks the server for the next one", () => {
    render(<LargeCatalogManager />);
    // Three rows fit on one page, so no pager is drawn.
    expect(screen.queryByRole("button", { name: /Next/ })).toBeNull();

    cleanup();
    state.total = LARGE_CATALOG_PAGE_SIZE * 3;
    render(<LargeCatalogManager />);

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(state.lastInput).toMatchObject({ page: 2 });
    expect(screen.getByText(`Page 2 of 3`)).toBeTruthy();
  });

  it("refuses to delete a built-in row or one that is in use", () => {
    render(<LargeCatalogManager />);

    expect(screen.getByRole("button", { name: "Delete University of Dhaka" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Delete Sylhet Agricultural University" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Delete New Private College" })).toHaveProperty("disabled", false);
  });

  it("saves renames and hides together, one row at a time", async () => {
    render(<LargeCatalogManager />);

    fireEvent.change(screen.getByLabelText("University of Dhaka"), { target: { value: "Dhaka University" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide New Private College" }));
    fireEvent.click(screen.getByRole("button", { name: "Save 2 changes" }));

    await vi.waitFor(() => expect(state.update).toHaveBeenCalledTimes(2));
    expect(state.update).toHaveBeenCalledWith({ catalog: "institutes", id: 1, name: "Dhaka University", active: true });
    expect(state.update).toHaveBeenCalledWith({ catalog: "institutes", id: 3, name: "New Private College", active: false });
  });

  it("counts only the deletable rows in a bulk delete", () => {
    render(<LargeCatalogManager />);

    fireEvent.click(screen.getByLabelText("Select University of Dhaka"));
    fireEvent.click(screen.getByLabelText("Select New Private College"));

    expect(screen.getByText("2 selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Delete 1/ })).toHaveProperty("disabled", false);
  });

  it("selects only the rows on the page in view", () => {
    render(<LargeCatalogManager />);

    fireEvent.click(screen.getByLabelText("Select every row on this page"));

    // Acting on rows from another page would be acting on rows unseen.
    expect(screen.getByText("3 selected")).toBeTruthy();
  });

  it("drops the selection and the search when the other catalog is opened", () => {
    render(<LargeCatalogManager />);
    fireEvent.change(screen.getByPlaceholderText("Search institutes"), { target: { value: "dhaka" } });
    fireEvent.click(screen.getByLabelText("Select University of Dhaka"));
    expect(screen.getByText("1 selected")).toBeTruthy();

    // Row ids belong to one catalog; carrying them across would point at
    // unrelated rows in the other.
    fireEvent.click(screen.getByRole("tab", { name: "Departments / subjects" }));

    expect(screen.queryByText("1 selected")).toBeNull();
    expect((screen.getByPlaceholderText("Search departments / subjects") as HTMLInputElement).value).toBe("");
    expect(state.lastInput).toMatchObject({ catalog: "departments", page: 1 });
  });

  it("surfaces a rejected save instead of pretending it worked", async () => {
    state.update.mockRejectedValue(new Error("\"University of Dhaka\" already uses that name."));
    render(<LargeCatalogManager />);

    fireEvent.change(screen.getByLabelText("New Private College"), { target: { value: "University of Dhaka" } });
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("already uses that name"));
  });
});
