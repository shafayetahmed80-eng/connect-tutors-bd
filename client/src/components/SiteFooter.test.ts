import { describe, expect, it } from "vitest";
import { footerQuickLinks, footerSupportChannels } from "./SiteFooter";

describe("homepage footer quick links", () => {
  it("includes a dedicated Admin Login destination", () => {
    expect(footerQuickLinks).toContainEqual({ label: "Admin Login", href: "/admin/login" });
  });

  it("includes a separate public Admin Help destination", () => {
    expect(footerQuickLinks).toContainEqual({ label: "Admin Help", href: "/admin/help" });
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
