import { describe, expect, it } from "vitest";
import {
  findSiteContentSlot,
  isSiteContactNumber,
  normalizeSiteContactNumber,
  telHref,
  whatsappHref,
} from "./site-content";

describe("site contact number", () => {
  it("ships the current support number as the slot default", () => {
    const slot = findSiteContentSlot("site.contact.whatsapp");

    expect(slot).toBeDefined();
    expect(slot?.kind).toBe("phone");
    expect(isSiteContactNumber(slot!.defaultText)).toBe(true);
  });

  it("accepts the shapes an Admin is likely to type", () => {
    // All of these are the same number written differently.
    for (const entry of ["8801516131411", "+8801516131411", "+880 1516 131411", "01516131411", "1516131411", "880-1516-131411"]) {
      expect(normalizeSiteContactNumber(entry), entry).toBe("8801516131411");
    }
  });

  it("rejects numbers that would produce a dead link", () => {
    for (const bad of ["", "12345", "8801216131411", "880151613141", "88015161314110", "not a number"]) {
      expect(isSiteContactNumber(normalizeSiteContactNumber(bad)), bad).toBe(false);
    }
  });

  it("builds the links every caller uses, with and without a prefilled message", () => {
    expect(whatsappHref("8801516131411")).toBe("https://wa.me/8801516131411");
    expect(telHref("8801516131411")).toBe("tel:+8801516131411");

    // The message is encoded, so punctuation cannot break the URL.
    expect(whatsappHref("8801516131411", "Hello Connect Tutors BD, I need help."))
      .toBe("https://wa.me/8801516131411?text=Hello%20Connect%20Tutors%20BD%2C%20I%20need%20help.");
  });
});
