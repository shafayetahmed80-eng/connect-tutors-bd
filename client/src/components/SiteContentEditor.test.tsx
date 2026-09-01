// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as Array<{ slotId: string; text: string | null; textSize: string | null; spacing: string | null }>,
  save: vi.fn().mockResolvedValue({}),
  reset: vi.fn().mockResolvedValue({}),
  invalidate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ siteContent: { list: { invalidate: mocks.invalidate } } }),
    siteContent: {
      list: { useQuery: () => ({ data: mocks.rows, isLoading: false, isError: false }) },
      save: { useMutation: () => ({ mutateAsync: mocks.save, isPending: false }) },
      reset: { useMutation: () => ({ mutateAsync: mocks.reset, isPending: false }) },
    },
  },
}));

import SiteContentEditor from "./SiteContentEditor";

const EDUCATION_TAB = "Education tab";

afterEach(() => {
  cleanup();
  mocks.rows = [];
  mocks.save.mockClear();
  mocks.reset.mockClear();
});

function editField(label: string, value: string) {
  const input = screen.getAllByLabelText(label, { selector: "input" })[0];
  fireEvent.change(input, { target: { value } });
  return input;
}

describe("Site content editor", () => {
  it("seeds every row from the copy in code and offers nothing to save", () => {
    render(<SiteContentEditor page="tutor-profile" />);

    expect(screen.getAllByLabelText(EDUCATION_TAB, { selector: "input" })[0]).toHaveProperty("value", "Education");
    expect(screen.getByRole("button", { name: "Saved" })).toHaveProperty("disabled", true);
  });

  it("saves every edited row at once rather than one button press per row", async () => {
    render(<SiteContentEditor page="tutor-profile" />);

    editField(EDUCATION_TAB, "Studies");
    editField("Personal tab", "About you");

    const saveButton = screen.getByRole("button", { name: "Save 2 changes" });
    fireEvent.click(saveButton);

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.c", text: "Studies", textSize: null });
    expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.a", text: "About you", textSize: null });
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  });

  it("clears the override when a row is edited back to the shipped copy", async () => {
    mocks.rows = [{ slotId: "tutor-profile.tab.c", text: "Studies", textSize: null, spacing: null }];
    render(<SiteContentEditor page="tutor-profile" />);

    editField(EDUCATION_TAB, "Education");
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    // Null text means "no override", so the row is deleted rather than stored.
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.c", text: null, textSize: null }));
  });

  it("offers Reset only for rows that actually have a stored override", () => {
    mocks.rows = [{ slotId: "tutor-profile.tab.c", text: "Studies", textSize: null, spacing: null }];
    render(<SiteContentEditor page="tutor-profile" />);

    expect(screen.getByRole("button", { name: `Reset Tutor dashboard ${EDUCATION_TAB}` })).toHaveProperty("disabled", false);
    // The same label exists on the public profile, so the name is surface-qualified.
    expect(screen.getByRole("button", { name: `Reset Public tutor profile ${EDUCATION_TAB}` })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Reset Tutor dashboard Personal tab" })).toHaveProperty("disabled", true);
  });

  it("filters rows by label or text so a long page stays navigable", () => {
    render(<SiteContentEditor page="tutor-profile" />);
    expect(screen.getAllByLabelText("Personal tab", { selector: "input" }).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Filter by label or text"), { target: { value: "qualification" } });

    expect(screen.queryByLabelText("Personal tab", { selector: "input" })).toBeNull();
    expect(screen.getAllByLabelText(/Qualification history/, { selector: "input" }).length).toBe(1);
  });

  it("groups the page's two surfaces separately", () => {
    render(<SiteContentEditor page="guardian-profile" />);

    const dashboard = screen.getByRole("heading", { name: "Guardian dashboard" }).closest("section")!;
    const journey = screen.getByRole("heading", { name: "Request a tutor" }).closest("section")!;

    expect(within(dashboard).getAllByLabelText("Page heading", { selector: "input" }).length).toBe(1);
    expect(within(journey).getAllByLabelText("Phone step heading", { selector: "input" }).length).toBe(1);
    expect(within(dashboard).queryByLabelText("Phone step heading", { selector: "input" })).toBeNull();
  });
});
