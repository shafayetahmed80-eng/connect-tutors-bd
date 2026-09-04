// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CollapsiblePanel } from "./CollapsiblePanel";

afterEach(cleanup);

describe("CollapsiblePanel", () => {
  it("starts closed so the page opens on its content", () => {
    render(<CollapsiblePanel title="Advanced filters"><input aria-label="Subject" /></CollapsiblePanel>);

    expect(screen.getByRole("button", { name: /Advanced filters/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("Subject")).toBeNull();
  });

  it("opens itself when a filter is already set", () => {
    // A hidden filter quietly shortening a list is how somebody concludes
    // there are no results when there are.
    render(<CollapsiblePanel title="Advanced filters" activeCount={2}><input aria-label="Subject" /></CollapsiblePanel>);

    expect(screen.getByRole("button", { name: /Advanced filters/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("Subject")).not.toBeNull();
  });

  it("says how many filters are set while it is closed", () => {
    render(<CollapsiblePanel title="Advanced filters" activeCount={3}><input aria-label="Subject" /></CollapsiblePanel>);

    expect(screen.getByText("3 active")).not.toBeNull();
  });

  it("counts nothing at the reader when nothing is set", () => {
    render(<CollapsiblePanel title="Advanced filters"><input aria-label="Subject" /></CollapsiblePanel>);

    expect(screen.queryByText(/active/)).toBeNull();
  });

  it("opens and closes from the header, which is the whole control", () => {
    render(<CollapsiblePanel title="Advanced filters"><input aria-label="Subject" /></CollapsiblePanel>);
    const header = screen.getByRole("button", { name: /Advanced filters/ });

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("Subject")).not.toBeNull();

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not reopen behind the reader when the active count changes", () => {
    const { rerender } = render(<CollapsiblePanel title="Advanced filters" activeCount={1}><input aria-label="Subject" /></CollapsiblePanel>);
    const header = screen.getByRole("button", { name: /Advanced filters/ });

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");

    // Clearing a filter must not fight somebody who just closed the panel.
    rerender(<CollapsiblePanel title="Advanced filters" activeCount={4}><input aria-label="Subject" /></CollapsiblePanel>);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps a closed panel's controls out of the tab order", () => {
    // Hiding with CSS would leave a select focusable that nobody can see.
    const { container } = render(<CollapsiblePanel title="Advanced filters"><select aria-label="Status" /></CollapsiblePanel>);

    expect(container.querySelectorAll("select")).toHaveLength(0);
  });

  it("names the region it controls, so the header and body are linked", () => {
    render(<CollapsiblePanel title="Advanced filters" activeCount={1}><input aria-label="Subject" /></CollapsiblePanel>);
    const header = screen.getByRole("button", { name: /Advanced filters/ });

    const bodyId = header.getAttribute("aria-controls");
    expect(bodyId).toBeTruthy();
    expect(document.getElementById(bodyId!)).not.toBeNull();
  });
});
