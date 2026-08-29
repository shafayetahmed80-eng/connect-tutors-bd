import { describe, expect, it } from "vitest";
import {
  clearTutorPortalToken,
  clearTutorPortalLoginHandoff,
  getTutorPortalToken,
  getTutorPortalRenewalIntervalMs,
  isTutorPortalLoginHandoffActive,
  markTutorPortalLoginHandoff,
  consumeTutorSignedOutNotice,
  markTutorSignedOutNotice,
  shouldEndTutorPortalSessionForLocation,
  shouldDeferTutorPortalPublicExitForLoginHandoff,
  shouldRequireTutorPortalSignIn,
  subscribeToTutorPortalGlobalLogout,
  storeTutorPortalToken,
  TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY,
} from "./tutorPortalSession";

function createStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value),
  };
}

describe("Tutor portal-session browser storage", () => {
  it("keeps a valid proof in tab-local session storage and clears only that tab proof", () => {
    const firstTab = createStorage();
    const secondTab = createStorage();

    storeTutorPortalToken(firstTab, "first-tab-proof");
    storeTutorPortalToken(secondTab, "second-tab-proof");
    clearTutorPortalToken(firstTab);

    expect(getTutorPortalToken(firstTab)).toBeNull();
    expect(getTutorPortalToken(secondTab)).toBe("second-tab-proof");
  });

  it("rejects empty and oversized values instead of storing an unsafe proof", () => {
    const storage = createStorage();

    storeTutorPortalToken(storage, " ");
    storeTutorPortalToken(storage, "x".repeat(513));

    expect(getTutorPortalToken(storage)).toBeNull();
  });

  it("notifies a sibling tab only when an explicit Tutor global logout broadcast arrives", () => {
    let listener: ((event: { key: string | null }) => void) | undefined;
    const eventTarget = {
      addEventListener: (_type: "storage", nextListener: (event: { key: string | null }) => void) => {
        listener = nextListener;
      },
      removeEventListener: (_type: "storage", nextListener: (event: { key: string | null }) => void) => {
        if (listener === nextListener) listener = undefined;
      },
    };
    let notifications = 0;

    const unsubscribe = subscribeToTutorPortalGlobalLogout(eventTarget, () => {
      notifications += 1;
    });

    listener?.({ key: "unrelated-key" });
    listener?.({ key: TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY });
    unsubscribe();
    listener?.({ key: TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY });

    expect(notifications).toBe(1);
  });

  it("requires a fresh Dashboard tab to sign in when it has no tab-local proof", () => {
    expect(shouldRequireTutorPortalSignIn("tutor", null)).toBe(true);
    expect(shouldRequireTutorPortalSignIn("tutor", "current-tab-proof")).toBe(false);
    expect(shouldRequireTutorPortalSignIn("guardian", null)).toBe(false);
  });

  it("ends only the current tab proof when a Tutor leaves the protected Dashboard", () => {
    expect(shouldEndTutorPortalSessionForLocation("/tutor/dashboard", "current-tab-proof")).toBe(false);
    expect(shouldEndTutorPortalSessionForLocation("/tutor/dashboard/jobs", "current-tab-proof")).toBe(false);
    expect(shouldEndTutorPortalSessionForLocation("/", "current-tab-proof")).toBe(true);
    expect(shouldEndTutorPortalSessionForLocation("/job-board", "current-tab-proof")).toBe(true);
    expect(shouldEndTutorPortalSessionForLocation("/", null)).toBe(false);
  });

  it("defers public-exit cleanup only while a newly issued proof is handing off from Tutor sign-in", () => {
    const storage = createStorage();

    markTutorPortalLoginHandoff(storage);

    expect(isTutorPortalLoginHandoffActive(storage)).toBe(true);
    expect(shouldDeferTutorPortalPublicExitForLoginHandoff("/tutor/login", true)).toBe(true);
    expect(shouldDeferTutorPortalPublicExitForLoginHandoff("/job-board", true)).toBe(false);
    expect(shouldDeferTutorPortalPublicExitForLoginHandoff("/tutor/login", false)).toBe(false);

    clearTutorPortalLoginHandoff(storage);
    expect(isTutorPortalLoginHandoffActive(storage)).toBe(false);
  });

  it("renews an active Dashboard proof before the one-minute server expiry", () => {
    expect(getTutorPortalRenewalIntervalMs()).toBe(20_000);
  });

  it("stores a one-time sign-out success notice for the initiating Tutor tab only", () => {
    const firstTab = createStorage();
    const secondTab = createStorage();

    markTutorSignedOutNotice(firstTab);

    expect(consumeTutorSignedOutNotice(firstTab)).toBe(true);
    expect(consumeTutorSignedOutNotice(firstTab)).toBe(false);
    expect(consumeTutorSignedOutNotice(secondTab)).toBe(false);
  });
});
