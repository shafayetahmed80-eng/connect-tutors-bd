// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The copy box, as opposed to the size number box or the select checkbox. */
const TEXT_BOX = "input:not([type=number]):not([type=checkbox])";

const mocks = vi.hoisted(() => ({
  rows: [] as Array<{ slotId: string; text: string | null; textSizePx: number | null; paddingPx?: number | null; spacing: string | null }>,
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
    expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.c", text: "Studies", textSizePx: null });
    expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.a", text: "About you", textSizePx: null });
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  });

  it("clears the override when a row is edited back to the shipped copy", async () => {
    mocks.rows = [{ slotId: "tutor-profile.tab.c", text: "Studies", textSizePx: null, spacing: null }];
    render(<SiteContentEditor page="tutor-profile" />);

    editField(EDUCATION_TAB, "Education");
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    // Null text means "no override", so the row is deleted rather than stored.
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.c", text: null, textSizePx: null }));
  });

  it("offers Reset only for rows that actually have a stored override", () => {
    mocks.rows = [{ slotId: "tutor-profile.tab.c", text: "Studies", textSizePx: null, spacing: null }];
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
    // Each surviving row has two boxes now - the copy and its size - so this
    // counts only the copy box.
    expect(screen.getAllByLabelText(/Qualification history/, { selector: TEXT_BOX }).length).toBe(1);
  });

  it("offers a pixel size for the profile record rows, which have no copy of their own", () => {
    render(<SiteContentEditor page="tutor-profile" />);

    const size = screen.getByLabelText("Tutor dashboard Profile record rows text size in pixels") as HTMLInputElement;

    expect(size.type).toBe("number");
    expect(size.value).toBe("12");
  });

  it("saves a changed size in pixels and treats the shipped size as no override", async () => {
    render(<SiteContentEditor page="tutor-profile" />);
    const size = screen.getByLabelText("Tutor dashboard Profile record rows text size in pixels");

    fireEvent.change(size, { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save 1 change$/ }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.size.record-row", textSizePx: 15 }));

    // Typing the shipped number back is not a change worth storing.
    mocks.save.mockClear();
    fireEvent.change(size, { target: { value: "12" } });
    expect(screen.getByRole("button", { name: "Saved" })).toBeTruthy();
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

describe("Site content editor bulk actions", () => {
  const select = (name: string) => fireEvent.click(screen.getByLabelText(name, { selector: "input[type=checkbox]" }));

  it("shows nothing until a row is ticked, then counts the selection", () => {
    render(<SiteContentEditor page="tutor-profile" />);
    expect(screen.queryByText(/^[0-9]+ selected$/)).toBeNull();

    select("Select Tutor dashboard Personal tab");

    expect(screen.getByText("1 selected")).toBeTruthy();
  });

  it("applies one size to every selected row in a single press", async () => {
    render(<SiteContentEditor page="tutor-profile" />);
    select("Select Tutor dashboard Personal tab");
    select("Select Tutor dashboard Education tab");

    fireEvent.change(screen.getByLabelText("Size in pixels for the selected rows"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply to 2" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.a", text: null, textSizePx: 18 });
    expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.c", text: null, textSizePx: 18 });
  });

  it("treats a bulk size equal to the shipped one as clearing the override", async () => {
    render(<SiteContentEditor page="tutor-profile" />);
    select("Select Tutor dashboard Personal tab");

    // The tabs ship at text-sm, so 14 is not a change worth storing.
    fireEvent.change(screen.getByLabelText("Size in pixels for the selected rows"), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply to 1" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.a", text: null, textSizePx: null }));
  });

  it("resets only the selected rows that actually have a stored override", async () => {
    mocks.rows = [{ slotId: "tutor-profile.tab.c", text: "Studies", textSizePx: null, paddingPx: null, spacing: null }];
    render(<SiteContentEditor page="tutor-profile" />);

    select("Select Tutor dashboard Personal tab");
    select("Select Tutor dashboard Education tab");
    fireEvent.click(screen.getByRole("button", { name: /Reset selected/ }));

    // Only the overridden row needs a call; the untouched one has nothing to clear.
    await waitFor(() => expect(mocks.reset).toHaveBeenCalledTimes(1));
    expect(mocks.reset).toHaveBeenCalledWith({ slotId: "tutor-profile.tab.c" });
  });

  it("ticks and clears a whole surface from its heading", () => {
    render(<SiteContentEditor page="guardian-profile" />);
    const all = screen.getByLabelText("Select every row under Request a tutor", { selector: "input" });

    fireEvent.click(all);
    const count = Number(screen.getByText(/^[0-9]+ selected$/).textContent!.split(" ")[0]);
    expect(count).toBeGreaterThan(1);

    fireEvent.click(all);
    expect(screen.queryByText(/^[0-9]+ selected$/)).toBeNull();
  });

  it("selects only what the filter leaves visible", () => {
    render(<SiteContentEditor page="tutor-profile" />);
    fireEvent.change(screen.getByPlaceholderText("Filter by label or text"), { target: { value: "qualification" } });

    fireEvent.click(screen.getByLabelText("Select every row under Tutor dashboard", { selector: "input" }));

    // Selecting rows hidden behind a filter would act on things unseen.
    expect(screen.getByText("1 selected")).toBeTruthy();
  });
});
