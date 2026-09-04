// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "./modal";

afterEach(cleanup);

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = props.onClose ?? vi.fn();
  const utils = render(
    <Modal onClose={onClose} {...props}>
      <ModalHeader title="Edit section" eyebrow="Section" srPrefix="Edit" />
      <ModalBody>
        <input aria-label="First field" defaultValue="a" />
        <input aria-label="Second field" defaultValue="b" />
      </ModalBody>
      <ModalFooter>
        <button type="button">Save</button>
      </ModalFooter>
    </Modal>,
  );
  return { onClose, ...utils };
}

describe("Modal", () => {
  it("names itself from the header title, with the sr-only prefix spoken first", () => {
    renderModal();
    // "Edit" (sr-only) + " " + "Edit section" — announced as one accessible name.
    expect(screen.getByRole("dialog", { name: "Edit Edit section" })).toBeTruthy();
  });

  it("lands focus on the first field in the body, never the header Close button", () => {
    renderModal();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "First field" }));
  });

  it("cycles Tab inside the panel: Close ⇢ … ⇢ Save ⇢ Close", async () => {
    const user = userEvent.setup({ document: window.document });
    renderModal();
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Close" });
    const save = within(dialog).getByRole("button", { name: "Save" });

    save.focus();
    await user.tab();
    expect(document.activeElement).toBe(close);

    close.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(save);
  });

  it("closes on Escape and on a backdrop click, but not on a click inside the panel", () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole("dialog");

    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stops answering Escape and the backdrop while busy or suspended", () => {
    const busy = renderModal({ busy: true });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(busy.onClose).not.toHaveBeenCalled();

    cleanup();

    let suspended = true;
    const gated = renderModal({ isSuspended: () => suspended });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(gated.onClose).not.toHaveBeenCalled();

    suspended = false;
    fireEvent.keyDown(document, { key: "Escape" });
    expect(gated.onClose).toHaveBeenCalledTimes(1);
  });

  it("locks the page scroll while open and returns it on unmount", () => {
    const { unmount } = renderModal();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("names its width tier for the stylesheet, and defaults to md", () => {
    // The pixel widths are the Owner's, set in Admin > Modals and applied by
    // SiteDimensionStyle against this tag — a media query cannot live in an
    // inline style, and a dialog is a full-width sheet on a phone regardless.
    const { rerender } = render(
      <Modal onClose={vi.fn()}><ModalHeader title="t" /><ModalBody>x</ModalBody></Modal>,
    );
    const panel = () => screen.getByRole("dialog");
    expect(panel().getAttribute("data-modal-size")).toBe("md");

    rerender(<Modal onClose={vi.fn()} size="sm"><ModalHeader title="t" /><ModalBody>x</ModalBody></Modal>);
    expect(panel().getAttribute("data-modal-size")).toBe("sm");

    rerender(<Modal onClose={vi.fn()} size="lg"><ModalHeader title="t" /><ModalBody>x</ModalBody></Modal>);
    expect(panel().getAttribute("data-modal-size")).toBe("lg");
  });

  it("dresses the panel as warm paper — no gradient, colour ring, glow, or blur", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!;

    expect(dialog.className).toContain("bg-background");
    expect(dialog.className).not.toMatch(/gradient|ring-\[|ring-1/);
    expect(dialog.className).not.toMatch(/rgba\(22,119,232/);
    expect(backdrop.className).not.toContain("backdrop-blur");
  });

  it("carries no appearance of its own, so nothing fights the Owner's settings", () => {
    // Radius, shadow, scrim and entrance speed are all set in Admin > Modals
    // and applied by SiteDimensionStyle against the two tags below. A utility
    // class for the same property left here would win or lose by cascade order,
    // which is not a thing to leave to chance.
    renderModal();
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!;

    expect(dialog.getAttribute("data-modal-size")).toBe("md");
    expect(backdrop.hasAttribute("data-modal-backdrop")).toBe(true);

    for (const owned of [/rounded-/, /shadow-/, /duration-/, /max-w-/]) {
      expect(dialog.className, String(owned)).not.toMatch(owned);
    }
    expect(backdrop.className).not.toMatch(/bg-j-ink|duration-/);
  });

  it("makes the body the only scroll region", () => {
    renderModal();
    const body = document.querySelector("[data-modal-body]")!;
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("flex-1");
    // header and footer hold their height
    const dialog = screen.getByRole("dialog");
    expect(within(dialog as HTMLElement).getByText("Save").closest("div")!.className).toContain("shrink-0");
  });

  it("throws if a slot is used outside <Modal>", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ModalHeader title="orphan" />)).toThrow(/must be rendered inside <Modal>/);
    spy.mockRestore();
  });
});
