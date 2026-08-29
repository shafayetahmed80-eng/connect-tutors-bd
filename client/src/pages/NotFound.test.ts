import { describe, expect, it } from "vitest";
import { notFoundRecoveryAction } from "./NotFound";

describe("Not Found recovery action", () => {
  it("returns visitors to a safe public starting point", () => {
    expect(notFoundRecoveryAction).toEqual({ href: "/", label: "Return home" });
  });
});
