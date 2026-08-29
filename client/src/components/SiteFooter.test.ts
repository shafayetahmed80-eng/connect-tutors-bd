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
  it("uses only the supplied support number and real internal public routes", () => {
    expect(footerSupportChannels).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: "https://wa.me/8801516131411" }),
      expect.objectContaining({ href: "/request-tutor" }),
      expect.objectContaining({ href: "/contact" }),
    ]));
    expect(footerSupportChannels.map((channel) => channel.href)).not.toContain("tel:+8801600000000");
    expect(footerSupportChannels.map((channel) => channel.href)).not.toContain("mailto:hello@connecttutorsbd.com");
  });
});
