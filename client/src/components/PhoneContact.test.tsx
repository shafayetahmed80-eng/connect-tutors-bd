// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("activates calling motion state with short delay before dialing", () => {
    vi.useFakeTimers();

    render(<PhoneContact phone="+8801712345678" />);
    const call = screen.getByRole("link", { name: "Call +880 1712 345678" });
    expect(call.getAttribute("data-calling")).toBeNull();

    act(() => {
      fireEvent.click(call);
    });

    expect(call.getAttribute("data-calling")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(call.getAttribute("data-calling")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(call.getAttribute("data-calling")).toBeNull();

    vi.useRealTimers();
  });

  it("activates WhatsApp motion state with short delay before opening", () => {
    vi.useFakeTimers();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<PhoneContact phone="+8801712345678" />);
    const whatsapp = screen.getByRole("link", { name: "Message +880 1712 345678 on WhatsApp" });
    expect(whatsapp.getAttribute("data-messaging")).toBeNull();

    act(() => {
      fireEvent.click(whatsapp);
    });

    expect(whatsapp.getAttribute("data-messaging")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(openSpy).toHaveBeenCalledWith("https://wa.me/8801712345678", "_blank", "noopener,noreferrer");

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(whatsapp.getAttribute("data-messaging")).toBeNull();

    openSpy.mockRestore();
    vi.useRealTimers();
  });
});

