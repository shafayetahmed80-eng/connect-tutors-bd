import { describe, expect, it, vi } from "vitest";
import { completeTutorLoginHandoff } from "./tutorLoginHandoff";

describe("Tutor login hand-off", () => {
  it("stores the tab proof, confirms fresh Tutor identity, then navigates", async () => {
    const events: string[] = [];
    const navigate = vi.fn(destination => events.push(`navigate:${destination}`));

    await completeTutorLoginHandoff({
      tutorPortalToken: "new-tab-proof",
      storeTutorPortalToken: token => events.push(`store:${token}`),
      clearTutorPortalToken: () => events.push("clear-proof"),
      fetchAuthenticatedUser: async () => {
        events.push("fetch");
        return { id: 44, name: "Test Tutor", role: "tutor", accountStatus: "active" };
      },
      navigate,
    });

    expect(events).toEqual([
      "store:new-tab-proof",
      "fetch",
      "navigate:/tutor/dashboard",
    ]);
  });

  it("navigates to a caller-supplied destination when one is given", async () => {
    const navigate = vi.fn();

    await completeTutorLoginHandoff({
      tutorPortalToken: "new-tab-proof",
      storeTutorPortalToken: vi.fn(),
      clearTutorPortalToken: vi.fn(),
      fetchAuthenticatedUser: async () => ({ id: 44, name: "Test Tutor", role: "tutor", accountStatus: "active" }),
      navigate,
      destination: "/tutor/dashboard/jobs",
    });

    expect(navigate).toHaveBeenCalledWith("/tutor/dashboard/jobs");
  });

  it("does not navigate when the freshly fetched identity is not a Tutor", async () => {
    const navigate = vi.fn();
    const clearTutorPortalToken = vi.fn();

    await expect(completeTutorLoginHandoff({
      tutorPortalToken: "new-tab-proof",
      storeTutorPortalToken: vi.fn(),
      clearTutorPortalToken,
      fetchAuthenticatedUser: async () => ({ id: 45, name: "Guardian", role: "guardian", accountStatus: "active" }),
      navigate,
    })).rejects.toThrow("This account is not a Tutor account.");

    expect(navigate).not.toHaveBeenCalled();
    expect(clearTutorPortalToken).toHaveBeenCalledOnce();
  });
});
