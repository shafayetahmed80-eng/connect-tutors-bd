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

  it("names its size for the stylesheet, and is a panel unless it says it is a dialog", () => {
    // The pixel widths and the panel height are the Owner's, set in Admin >
    // Modals and applied by SiteDimensionStyle against this tag — a media query
    // cannot live in an inline style, and either is a full-width sheet on a phone.
    const { rerender } = render(
      <Modal onClose={vi.fn()}><ModalHeader title="t" /><ModalBody>x</ModalBody></Modal>,
    );
    const panel = () => screen.getByRole("dialog");
    expect(panel().getAttribute("data-modal-size")).toBe("panel");

    rerender(<Modal onClose={vi.fn()} size="dialog"><ModalHeader title="t" /><ModalBody>x</ModalBody></Modal>);
    expect(panel().getAttribute("data-modal-size")).toBe("dialog");
  });

  it("stands the panel height unless it is asked to fit its content", () => {
    const { rerender } = render(<Modal onClose={vi.fn()}><ModalHeader title="t" /><ModalBody>x</ModalBody></Modal>);
    expect(screen.getByRole("dialog").hasAttribute("data-modal-fit")).toBe(false);

    rerender(<Modal onClose={vi.fn()} fit><ModalHeader title="t" /><ModalBody>x</ModalBody></Modal>);
    expect(screen.getByRole("dialog").hasAttribute("data-modal-fit")).toBe(true);
    expect(screen.getByRole("dialog").getAttribute("data-modal-size")).toBe("panel");
  });

  it("stops at 92% of the visible window on a phone, not of the largest one the browser could show", () => {
    // `vh` is the window with the browser's bars tucked away; with the address
    // bar showing, a sheet 92vh tall runs under it and its footer is out of reach.
    renderModal();

    expect(screen.getByRole("dialog").className).toContain("max-h-[92dvh]");
    expect(screen.getByRole("dialog").className).not.toContain("92vh");
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

    expect(dialog.getAttribute("data-modal-size")).toBe("panel");
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

describe("the plain surface", () => {
  it("draws nothing behind the body, on a laptop or a phone: no water, no rings", () => {
    render(<Modal onClose={() => {}}><ModalHeader title="Edit" /><ModalBody>x</ModalBody><ModalFooter>f</ModalFooter></Modal>);
    const dialog = screen.getByRole("dialog");

    expect(Array.from(dialog.querySelectorAll("svg")).filter(svg => !svg.closest("button"))).toHaveLength(0);
    expect(dialog.querySelector("[aria-hidden=true].absolute")).toBeNull();
    expect(document.querySelector("[data-modal-body]")?.className).toContain("bg-background");
  });

  it("keeps the header and footer as white bands on a laptop and ash on a phone, closed off by a hairline", () => {
    render(<Modal onClose={() => {}}><ModalHeader title="Edit" /><ModalBody>x</ModalBody><ModalFooter>f</ModalFooter></Modal>);
    const header = screen.getByRole("heading", { name: "Edit" }).closest("div[class*=border-b]") as HTMLElement;
    const footer = screen.getByText("f").closest("div[class*=border-t]") as HTMLElement;

    for (const band of [header, footer]) {
      expect(band.className).toContain("bg-white");
      expect(band.className).toContain("max-sm:bg-[#eef2f5]");
    }
  });

  it("lets a long title run to two lines on a phone and keeps one line above it", () => {
    render(<Modal onClose={() => {}}><ModalHeader title="Need English Medium Tutor for O Level Student - 4 Days / Week" /></Modal>);
    const title = screen.getByRole("heading");

    expect(title.className).toContain("line-clamp-2");
    expect(title.className).toContain("sm:line-clamp-1");
  });
});
