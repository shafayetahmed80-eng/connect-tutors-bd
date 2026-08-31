import { describe, expect, it } from "vitest";
import { maskIdentifier, recordAuthAudit } from "./auth-audit";

describe("maskIdentifier", () => {
  it("keeps the first two local characters and the domain of an email", () => {
    expect(maskIdentifier("shafayet@example.com")).toBe("sh******@example.com");
    expect(maskIdentifier("a@b.co")).toBe("a*@b.co");
  });

  it("keeps only the last three digits of a phone-like identifier", () => {
    expect(maskIdentifier("+8801712345678")).toBe("***********678");
    expect(maskIdentifier("12")).toBe("**");
  });

  it("returns an empty string for blank input", () => {
    expect(maskIdentifier("   ")).toBe("");
  });
});

describe("recordAuthAudit", () => {
  it("emits one prefixed JSON line with a masked identifier and no raw credential material", () => {
    const lines: string[] = [];
    recordAuthAudit("login_failure", { role: "tutor", ip: "203.0.113.5", identifier: "shafayet@example.com", reason: "invalid-credentials" }, line => lines.push(line));

    expect(lines).toHaveLength(1);
    expect(lines[0].startsWith("[auth-audit] ")).toBe(true);
    const payload = JSON.parse(lines[0].slice("[auth-audit] ".length));
    expect(payload).toMatchObject({
      scope: "auth",
      event: "login_failure",
      role: "tutor",
      ip: "203.0.113.5",
      identifier: "sh******@example.com",
      reason: "invalid-credentials",
    });
    expect(typeof payload.ts).toBe("string");
    expect(lines[0]).not.toContain("shafayet@example.com");
  });

  it("omits absent optional fields", () => {
    const lines: string[] = [];
    recordAuthAudit("registration_blocked", { ip: "198.51.100.9" }, line => lines.push(line));
    const payload = JSON.parse(lines[0].slice("[auth-audit] ".length));
    expect(payload).toMatchObject({ scope: "auth", event: "registration_blocked", ip: "198.51.100.9" });
    expect(payload).not.toHaveProperty("identifier");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("reason");
  });
});
