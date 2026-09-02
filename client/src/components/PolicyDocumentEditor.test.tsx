// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { policyPages } from "@shared/policy-pages";

const state = vi.hoisted(() => ({
  rows: [] as Array<{ pageKey: string; body: string; updatedAt: Date | null }>,
  save: vi.fn(),
  reset: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ policyDocuments: { list: { invalidate: state.invalidate } } }),
    policyDocuments: {
      list: { useQuery: () => ({ data: state.rows, isLoading: false, isError: false }) },
      save: { useMutation: () => ({ mutateAsync: state.save }) },
      reset: { useMutation: () => ({ mutateAsync: state.reset }) },
    },
  },
}));

import PolicyDocumentEditor from "./PolicyDocumentEditor";

const terms = policyPages.find(page => page.key === "terms-conditions")!;

beforeEach(() => {
  state.rows = [];
  for (const spy of [state.save, state.reset, state.invalidate]) spy.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("policy document editor", () => {
  it("starts on the Terms with the document the site ships", () => {
    render(<PolicyDocumentEditor />);
    expect((screen.getByLabelText("Terms of Use") as HTMLTextAreaElement).value).toBe(terms.defaultBody);
    expect(screen.getByText(/As shipped/)).toBeTruthy();
  });

  it("offers no Reset until the Owner has actually changed something", () => {
    const { unmount } = render(<PolicyDocumentEditor />);
    // Resetting a page that was never edited would do nothing.
    expect(screen.queryByRole("button", { name: /Reset/ })).toBeNull();
    unmount();

    state.rows = [{ pageKey: "terms-conditions", body: "## Edited", updatedAt: null }];
    render(<PolicyDocumentEditor />);
    expect(screen.getByText(/Edited by you/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reset/ })).toBeTruthy();
  });

  it("saves the page being edited, not always the first one", async () => {
    render(<PolicyDocumentEditor />);
    fireEvent.click(screen.getByRole("tab", { name: "Privacy Policy" }));
    fireEvent.change(screen.getByLabelText("Privacy Policy"), { target: { value: "## New privacy" } });
    fireEvent.click(screen.getByRole("button", { name: "Save document" }));

    await vi.waitFor(() => expect(state.save).toHaveBeenCalledWith({ pageKey: "privacy-policy", body: "## New privacy" }));
  });

  it("will not save when nothing has changed", () => {
    render(<PolicyDocumentEditor />);
    expect(screen.getByRole("button", { name: /No changes/ })).toHaveProperty("disabled", true);
  });

  it("asks twice before discarding the Owner's version", async () => {
    state.rows = [{ pageKey: "terms-conditions", body: "## Edited", updatedAt: null }];
    render(<PolicyDocumentEditor />);

    fireEvent.click(screen.getByRole("button", { name: /Reset/ }));
    expect(state.reset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Confirm reset/ }));
    await vi.waitFor(() => expect(state.reset).toHaveBeenCalledWith({ pageKey: "terms-conditions" }));
  });

  it("previews through the same renderer the public page uses", () => {
    render(<PolicyDocumentEditor />);
    fireEvent.change(screen.getByLabelText("Terms of Use"), { target: { value: "## Live heading\n\n- a bullet" } });

    expect(screen.getByRole("heading", { name: "Live heading", level: 2 })).toBeTruthy();
    expect(screen.getByRole("listitem").textContent).toBe("a bullet");
  });

  it("shows a hostile document as words rather than running it", () => {
    render(<PolicyDocumentEditor />);
    fireEvent.change(screen.getByLabelText("Terms of Use"), { target: { value: '<img src=x onerror="alert(1)">' } });

    // The preview must not become the one place an injection succeeds. The
    // textarea holds the same characters, so the check is scoped to the panel
    // that actually renders them.
    const preview = screen.getByText("Preview").closest("section")!;
    expect(preview.querySelector("img")).toBeNull();
    expect(preview.querySelector("script")).toBeNull();
    expect(preview.textContent).toContain('<img src=x onerror="alert(1)">');
  });

  it("surfaces a rejected save instead of pretending it worked", async () => {
    state.save.mockRejectedValue(new Error("Keep the document under 40000 characters."));
    render(<PolicyDocumentEditor />);
    fireEvent.change(screen.getByLabelText("Terms of Use"), { target: { value: "## Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save document" }));

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("under 40000 characters"));
  });
});
