import { describe, expect, it } from "vitest";
import { phoneCodeMessage } from "./phone-verification";

describe("the code SMS", () => {
  it("keeps the provider's wording and ends with the host-bound line a phone reads to fill the code in", () => {
    expect(phoneCodeMessage("4821", "https://connecttutorsbd.com", true)).toBe("Your Connect Tutors OTP is 4821\n\n@connecttutorsbd.com #4821");
  });

  it("takes the host from the published address, ignoring a trailing slash and a port", () => {
    expect(phoneCodeMessage("1234", "https://connecttutorsbd.com/", true)).toContain("\n\n@connecttutorsbd.com #1234");
    expect(phoneCodeMessage("1234", "http://localhost:3000", true)).toContain("\n\n@localhost #1234");
  });

  it("is the plain wording alone when the extra line is switched off, or the address is unusable", () => {
    expect(phoneCodeMessage("4821", "https://connecttutorsbd.com", false)).toBe("Your Connect Tutors OTP is 4821");
    expect(phoneCodeMessage("4821", "not a url", true)).toBe("Your Connect Tutors OTP is 4821");
  });

  it("puts the code last on the last line, which is where the browser looks for it", () => {
    const lines = phoneCodeMessage("0007", "https://connecttutorsbd.com", true).split("\n");
    expect(lines[lines.length - 1]).toMatch(/^@[\w.-]+ #0007$/);
  });
});
