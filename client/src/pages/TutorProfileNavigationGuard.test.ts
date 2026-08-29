import { describe, expect, it, vi } from "vitest";
import { resolveTutorProfileHistoryNavigation, shouldAllowTutorProfileNavigation } from "./TutorProfileNavigationGuard";

describe("Tutor Profile unsaved navigation guard", () => {
  it("allows navigation immediately when the draft is unchanged", () => {
    const confirmLeave = vi.fn();

    expect(shouldAllowTutorProfileNavigation(false, confirmLeave)).toBe(true);
    expect(confirmLeave).not.toHaveBeenCalled();
  });

  it("asks for confirmation when a draft has changed", () => {
    const confirmLeave = vi.fn(() => false);

    expect(shouldAllowTutorProfileNavigation(true, confirmLeave)).toBe(false);
    expect(confirmLeave).toHaveBeenCalledOnce();
  });

  it("restores the current Profile route when browser back is cancelled", () => {
    expect(resolveTutorProfileHistoryNavigation(true, () => false)).toBe("restore");
  });

  it("allows browser back when the Tutor confirms leaving an unsaved draft", () => {
    expect(resolveTutorProfileHistoryNavigation(true, () => true)).toBe("leave");
  });
});
