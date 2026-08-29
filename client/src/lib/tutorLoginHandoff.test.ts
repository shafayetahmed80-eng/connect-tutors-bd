import { describe, expect, it, vi } from "vitest";
import { completeTutorLoginHandoff } from "./tutorLoginHandoff";

describe("Tutor login hand-off", () => {
  it("stores and protects the tab proof, confirms fresh Tutor identity, then navigates", async () => {
    const events: string[] = [];
    const navigate = vi.fn(destination => events.push(`navigate:${destination}`));

    await completeTutorLoginHandoff({
      tutorPortalToken: "new-tab-proof",
      storeTutorPortalToken: token => events.push(`store:${token}`),
      markPortalLoginHandoff: () => events.push("protect"),
      clearTutorPortalToken: () => events.push("clear-proof"),
      clearPortalLoginHandoff: () => events.push("clear-protection"),
      fetchAuthenticatedUser: async () => {
        events.push("fetch");
        return { id: 44, name: "Test Tutor", role: "tutor", accountStatus: "active" };
      },
      navigate,
    });

    expect(events).toEqual([
      "store:new-tab-proof",
      "protect",
      "fetch",
      "navigate:/tutor/dashboard",
    ]);
  });

  it("does not navigate when the freshly fetched identity is not a Tutor", async () => {
    const navigate = vi.fn();
    const clearTutorPortalToken = vi.fn();
    const clearPortalLoginHandoff = vi.fn();

    await expect(completeTutorLoginHandoff({
      tutorPortalToken: "new-tab-proof",
      storeTutorPortalToken: vi.fn(),
      markPortalLoginHandoff: vi.fn(),
      clearTutorPortalToken,
      clearPortalLoginHandoff,
      fetchAuthenticatedUser: async () => ({ id: 45, name: "Guardian", role: "guardian", accountStatus: "active" }),
      navigate,
    })).rejects.toThrow("This account is not a Tutor account.");

    expect(navigate).not.toHaveBeenCalled();
    expect(clearTutorPortalToken).toHaveBeenCalledOnce();
    expect(clearPortalLoginHandoff).toHaveBeenCalledOnce();
  });
});
