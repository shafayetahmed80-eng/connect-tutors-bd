import { describe, expect, it } from "vitest";
import { footerQuickLinks, footerSupportChannels } from "./SiteFooter";

describe("homepage footer quick links", () => {
  it("lists only the two legal pages", () => {
    expect(footerQuickLinks).toEqual([
      { label: "Privacy", href: "/privacy-policy" },
      { label: "Terms", href: "/terms-conditions" },
    ]);
  });

  it("does not advertise the Admin entrance to everyone who scrolls to the bottom", () => {
    const hrefs = footerQuickLinks.map((link) => link.href);

    expect(hrefs.some((href) => href.startsWith("/admin"))).toBe(false);
  });
});

describe("footer support information", () => {
  it("points at real internal public routes, never a placeholder contact", () => {
    expect(footerSupportChannels).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: "/request-tutor" }),
      expect.objectContaining({ href: "/contact" }),
    ]));
    expect(footerSupportChannels.map((channel) => channel.href)).not.toContain("tel:+8801600000000");
    expect(footerSupportChannels.map((channel) => channel.href)).not.toContain("mailto:hello@connecttutorsbd.com");
  });

  it("leaves the WhatsApp row's number blank so the Admin-editable one fills it", () => {
    const whatsapp = footerSupportChannels.find((channel) => channel.type === "whatsapp");

    // A number hardcoded here would silently outrank the one in the Admin panel.
    expect(whatsapp).toBeDefined();
    expect(whatsapp?.href).toBe("");
    expect(whatsapp?.action).toBe("");
    for (const channel of footerSupportChannels) {
      expect(channel.href).not.toMatch(/wa\.me|tel:/);
    }
  });
});
