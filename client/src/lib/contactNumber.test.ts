import { describe, expect, it } from "vitest";
import { contactNumberLinks } from "./contactNumber";

describe("the links a stored mobile number gives", () => {
  it("rings the number, opens a WhatsApp chat with it, and writes it in groups", () => {
    expect(contactNumberLinks("+8801712345678")).toEqual({
      display: "+880 1712 345678",
      tel: "tel:+8801712345678",
      whatsapp: "https://wa.me/8801712345678",
    });
  });

  it("builds the same links however the number was typed", () => {
    for (const typed of ["01712345678", "01712-345678", "880 1712 345678", "+880 1712-345678", "1712345678"]) {
      expect(contactNumberLinks(typed)?.tel, typed).toBe("tel:+8801712345678");
      expect(contactNumberLinks(typed)?.whatsapp, typed).toBe("https://wa.me/8801712345678");
    }
  });

  it("gives no links for what is not a Bangladesh mobile, rather than one that would not connect", () => {
    for (const other of ["", "not a number", "+441234567890", "0171234", "+8801212345678"]) {
      expect(contactNumberLinks(other), other).toBeNull();
    }
  });
});
