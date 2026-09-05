// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as Array<{ id: number; name: string; active: boolean; sortOrder: number; origin: string; usageCount: number }>,
  isLoading: false,
  isError: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
  invalidate: vi.fn(),
  lastQueryInput: null as unknown,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ optionCatalogs: { list: { invalidate: state.invalidate } } }),
    optionCatalogs: {
      list: {
        useQuery: (input: unknown) => {
          state.lastQueryInput = input;
          return { data: state.rows, isLoading: state.isLoading, isError: state.isError };
        },
      },
      create: { useMutation: () => ({ mutateAsync: state.create }) },
      update: { useMutation: () => ({ mutateAsync: state.update }) },
      remove: { useMutation: () => ({ mutateAsync: state.remove }) },
      reorder: { useMutation: () => ({ mutateAsync: state.reorder }) },
    },
  },
}));

import OptionCatalogManager from "./OptionCatalogManager";

const seedRow = { id: 1, name: "Mathematics", active: true, sortOrder: 1, origin: "seed", usageCount: 0 };
const usedRow = { id: 2, name: "Physics", active: true, sortOrder: 2, origin: "seed", usageCount: 3 };
const adminRow = { id: 3, name: "Robotics", active: true, sortOrder: 3, origin: "admin", usageCount: 0 };

beforeEach(() => {
  state.rows = [seedRow, usedRow, adminRow];
  state.isLoading = false;
  state.isError = false;
  for (const spy of [state.create, state.update, state.remove, state.reorder, state.invalidate]) spy.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("option catalog manager", () => {
  it("opens on Subjects and switches catalog when another tab is picked", () => {
    render(<OptionCatalogManager />);
    expect(state.lastQueryInput).toEqual({ catalog: "subjects" });

    fireEvent.click(screen.getByRole("tab", { name: "Curricula" }));

    expect(state.lastQueryInput).toEqual({ catalog: "curricula" });
  });

  it("saves renames and hides together, one row at a time", async () => {
    render(<OptionCatalogManager />);

    fireEvent.change(screen.getByLabelText("Mathematics"), { target: { value: "Maths" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide Physics" }));

    const save = screen.getByRole("button", { name: "Save 2 changes" });
    fireEvent.click(save);
    await vi.waitFor(() => expect(state.update).toHaveBeenCalledTimes(2));

    expect(state.update).toHaveBeenCalledWith({ catalog: "subjects", id: 1, name: "Maths", active: true });
    expect(state.update).toHaveBeenCalledWith({ catalog: "subjects", id: 2, name: "Physics", active: false });
  });

  it("refuses to delete a built-in option or one a tutor is using", () => {
    render(<OptionCatalogManager />);

    // Built-in and unused: the next deploy would bring it back.
    expect(screen.getByRole("button", { name: "Delete Mathematics" })).toHaveProperty("disabled", true);
    // In use: deleting it would strip a saved selection off real profiles.
    expect(screen.getByRole("button", { name: "Delete Physics" })).toHaveProperty("disabled", true);
    // The Owner's own unused addition can go.
    expect(screen.getByRole("button", { name: "Delete Robotics" })).toHaveProperty("disabled", false);
  });

  it("asks for a second click before deleting", async () => {
    render(<OptionCatalogManager />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Robotics" }));
    expect(state.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm deleting Robotics" }));
    await vi.waitFor(() => expect(state.remove).toHaveBeenCalledWith({ catalog: "subjects", id: 3 }));
  });

  it("sends the whole new order when a row moves", async () => {
    render(<OptionCatalogManager />);

    fireEvent.click(screen.getByRole("button", { name: "Move Robotics up" }));

    await vi.waitFor(() => expect(state.reorder).toHaveBeenCalledWith({ catalog: "subjects", orderedIds: [1, 3, 2] }));
  });

  it("locks reordering while a filter hides part of the list", () => {
    render(<OptionCatalogManager />);

    fireEvent.change(screen.getByPlaceholderText("Filter subjects"), { target: { value: "ph" } });

    // Moving "up" against a filtered view would swap with a row you cannot see.
    expect(screen.queryByLabelText("Mathematics")).toBeNull();
    expect(screen.getByRole("button", { name: "Move Physics up" })).toHaveProperty("disabled", true);
  });

  it("adds a new option and clears the box", async () => {
    render(<OptionCatalogManager />);

    const box = screen.getByPlaceholderText("Add a subject");
    fireEvent.change(box, { target: { value: "  Astronomy  " } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await vi.waitFor(() => expect(state.create).toHaveBeenCalledWith({ catalog: "subjects", name: "Astronomy" }));
    await vi.waitFor(() => expect((box as HTMLInputElement).value).toBe(""));
  });

  it("surfaces a rejected save instead of pretending it worked", async () => {
    state.update.mockRejectedValue(new Error("\"Physics\" already uses that name."));
    render(<OptionCatalogManager />);

    fireEvent.change(screen.getByLabelText("Mathematics"), { target: { value: "Physics" } });
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("already uses that name"));
  });

  it("hides every selected option in one press, skipping those already hidden", async () => {
    state.rows = [seedRow, { ...usedRow, active: false }, adminRow];
    render(<OptionCatalogManager />);

    fireEvent.click(screen.getByLabelText("Select Mathematics"));
    fireEvent.click(screen.getByLabelText("Select Physics"));
    fireEvent.click(screen.getByRole("button", { name: /^Hide$/ }));

    // Physics is already hidden, so only Mathematics needs a call.
    await vi.waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(state.update).toHaveBeenCalledWith({ catalog: "subjects", id: 1, name: "Mathematics", active: false });
  });

  it("only offers to delete the selected rows that are actually deletable", () => {
    render(<OptionCatalogManager />);

    fireEvent.click(screen.getByLabelText("Select Mathematics"));
    fireEvent.click(screen.getByLabelText("Select Robotics"));

    // Three selected, but a built-in and an in-use option can only be hidden.
    expect(screen.getByText("2 selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Delete 1/ })).toHaveProperty("disabled", false);
  });

  it("asks for a second press before deleting in bulk", async () => {
    render(<OptionCatalogManager />);
    fireEvent.click(screen.getByLabelText("Select Robotics"));

    fireEvent.click(screen.getByRole("button", { name: /Delete 1/ }));
    expect(state.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Confirm deleting 1/ }));
    await vi.waitFor(() => expect(state.remove).toHaveBeenCalledWith({ catalog: "subjects", id: 3 }));
  });

  it("selects every visible row from the header, and only the visible ones", () => {
    render(<OptionCatalogManager />);
    fireEvent.change(screen.getByPlaceholderText("Filter subjects"), { target: { value: "ph" } });

    fireEvent.click(screen.getByLabelText("Select every matching option"));

    // Selecting rows hidden behind a filter would act on things unseen.
    expect(screen.getByText("1 selected")).toBeTruthy();
  });

  it("drops the selection when another catalog is opened", () => {
    render(<OptionCatalogManager />);
    fireEvent.click(screen.getByLabelText("Select Mathematics"));
    expect(screen.getByText("1 selected")).toBeTruthy();

    // Row ids are per-catalog, so a carried-over selection would point at
    // unrelated rows in the next tab.
    fireEvent.click(screen.getByRole("tab", { name: "Curricula" }));

    expect(screen.queryByText("1 selected")).toBeNull();
  });

  it("counts the hidden options so the Owner can see what is switched off", () => {
    state.rows = [seedRow, { ...usedRow, active: false }, adminRow];
    render(<OptionCatalogManager />);

    expect(screen.getByText("3 total, 1 hidden")).toBeTruthy();
  });
});
