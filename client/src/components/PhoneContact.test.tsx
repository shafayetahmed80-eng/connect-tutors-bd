// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { PhoneContact } from "./PhoneContact";

afterEach(cleanup);

describe("PhoneContact", () => {
  it("is the number itself as a call link, with a WhatsApp link beside it", () => {
    render(<PhoneContact phone="+8801712345678" />);

    const call = screen.getByRole("link", { name: "Call +880 1712 345678" });
    expect(call.getAttribute("href")).toBe("tel:+8801712345678");
    expect(call.textContent).toBe("+880 1712 345678");

    const whatsapp = screen.getByRole("link", { name: "Message +880 1712 345678 on WhatsApp" });
    expect(whatsapp.getAttribute("href")).toBe("https://wa.me/8801712345678");
    expect(whatsapp.getAttribute("target")).toBe("_blank");
    // The new tab gets no window.opener and no referrer.
    expect(whatsapp.getAttribute("rel")).toBe("noreferrer");
    expect(whatsapp.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("is not drawn as a button: no fill and no border on the number or on the WhatsApp mark", () => {
    render(<PhoneContact phone="+8801712345678" />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className, link.getAttribute("aria-label")!).not.toMatch(/(^|\s)(bg-|border)/);
    }
  });

  it("is pressed in an area larger than what is drawn, and a thumb's 40px on a phone card", () => {
    const { rerender } = render(<PhoneContact phone="+8801712345678" />);
    const [call, whatsapp] = screen.getAllByRole("link");
    expect(call.className).toContain("min-h-8");
    expect(whatsapp.className).toContain("size-8");

    rerender(<PhoneContact phone="+8801712345678" size="card" />);
    const [cardCall, cardWhatsapp] = screen.getAllByRole("link");
    expect(cardCall.className).toContain("min-h-10");
    expect(cardWhatsapp.className).toContain("size-10");
  });

  it("writes a number it cannot link as it came, with no links", () => {
    render(<PhoneContact phone="Not a number" />);
    expect(screen.getByText("Not a number")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
