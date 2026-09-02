// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: [] as Array<{ slotId: string; text: string | null; textSize: string | null; spacing: string | null }>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: { siteContent: { list: { useQuery: () => ({ data: state.data, isLoading: false, isError: false }) } } },
}));

import { SiteContentProvider, SiteText, useSiteContact, useSiteContentSpacingClass } from "./siteContent";

const HEADING_SLOT = "tutor-profile.group.c-education";

function Spacing() {
  return <p data-testid="spacing">{useSiteContentSpacingClass("tutor-profile.spacing.section-card")}</p>;
}

function renderSlot(children = <SiteText slotId={HEADING_SLOT} className="text-sm font-bold" />) {
  return render(<SiteContentProvider page="tutor-profile">{children}</SiteContentProvider>);
}

afterEach(() => {
  cleanup();
  state.data = [];
});

describe("site content rendering", () => {
  it("shows the copy shipped in code when nothing is overridden", () => {
    renderSlot();

    const slot = screen.getByText("Education");
    // No size class is emitted, so the call site's own styling survives.
    expect(slot.className).toContain("text-sm");
    expect(slot.className).toContain("font-bold");
  });

  it("shows the Admin's wording and size step once an override exists", () => {
    state.data = [{ slotId: HEADING_SLOT, text: "Academic background", textSize: "larger", spacing: null }];
    renderSlot();

    const slot = screen.getByText("Academic background");
    expect(screen.queryByText("Education")).toBeNull();
    // text-sm stepped one rung up the ramp.
    expect(slot.className).toContain("text-base");
    expect(slot.className).toContain("font-bold");
  });

  it("keeps the shipped copy when an override is blank, so a page is never left empty", () => {
    state.data = [{ slotId: HEADING_SLOT, text: "   ", textSize: null, spacing: null }];
    renderSlot();

    expect(screen.getByText("Education")).toBeTruthy();
  });

  it("ignores an override for a slot the registry no longer declares", () => {
    state.data = [{ slotId: "tutor-profile.removed-slot", text: "Ghost", textSize: null, spacing: null }];
    renderSlot();

    expect(screen.queryByText("Ghost")).toBeNull();
    expect(screen.getByText("Education")).toBeTruthy();
  });

  it("applies a spacing override and falls back to the default padding without one", () => {
    renderSlot(<Spacing />);
    const defaultPadding = screen.getByTestId("spacing").textContent;
    cleanup();

    state.data = [{ slotId: "tutor-profile.spacing.section-card", text: null, textSize: null, spacing: "roomy" }];
    renderSlot(<Spacing />);

    expect(screen.getByTestId("spacing").textContent).not.toBe(defaultPadding);
  });
});

function Contact() {
  const contact = useSiteContact();
  return <a href={contact.whatsapp("Help me")} data-testid="wa">{contact.display}</a>;
}

describe("site-wide contact slot", () => {
  it("falls back to the number shipped in code", () => {
    render(<SiteContentProvider page="site"><Contact /></SiteContentProvider>);

    expect(screen.getByTestId("wa").getAttribute("href")).toBe("https://wa.me/8801516131411?text=Help%20me");
    expect(screen.getByTestId("wa").textContent).toBe("+8801516131411");
  });

  it("uses the Admin's number, normalized, across every link built from it", () => {
    state.data = [{ slotId: "site.contact.whatsapp", text: "+880 1712 345678", textSize: null, spacing: null }];
    render(<SiteContentProvider page="site"><Contact /></SiteContentProvider>);

    expect(screen.getByTestId("wa").getAttribute("href")).toBe("https://wa.me/8801712345678?text=Help%20me");
  });

  it("keeps site slots readable inside a page that adds its own provider", () => {
    // The header and footer sit on pages with their own provider; a provider
    // that replaced its parent would blank the support number there.
    state.data = [{ slotId: "site.contact.whatsapp", text: "8801712345678", textSize: null, spacing: null }];
    render(
      <SiteContentProvider page="site">
        <SiteContentProvider page="tutor-profile"><Contact /></SiteContentProvider>
      </SiteContentProvider>,
    );

    expect(screen.getByTestId("wa").getAttribute("href")).toContain("8801712345678");
  });
});
