// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/siteContent", () => ({
  useSiteContact: () => ({ number: "8801516131411", display: "+8801516131411", tel: "tel:+8801516131411", whatsapp: () => "https://wa.me/8801516131411" }),
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));

import SiteHeader from "./SiteHeader";

afterEach(cleanup);

describe("the header's contact strip", () => {
  it("offers WhatsApp as a quiet line icon beside the number, not a coloured badge", () => {
    render(<SiteHeader />);

    const whatsapp = screen.getByRole("link", { name: "Message Connect Tutors on WhatsApp" });
    expect(whatsapp.getAttribute("href")).toBe("https://wa.me/8801516131411");
    expect(whatsapp.getAttribute("target")).toBe("_blank");
    // One line icon, drawn the way the phone icon next to it is.
    const icon = whatsapp.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("lucide-message-circle");
    expect(icon?.getAttribute("fill")).toBe("none");
  });

  it("keeps the number as text in the same strip", () => {
    render(<SiteHeader />);

    expect(screen.getByText("+880 1516 131411")).toBeTruthy();
  });
});
