// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { forgetBellCountsForTests, useBellSwing } from "./bellSwing";

beforeEach(() => forgetBellCountsForTests());

describe("the header bell", () => {
  it("stays still while the count loads and when a tab first learns it", () => {
    const { result, rerender } = renderHook(({ count }) => useBellSwing("Tutor Portal", count), { initialProps: { count: undefined as number | undefined } });
    expect(result.current.swinging).toBe(false);
    rerender({ count: 3 });
    expect(result.current.swinging).toBe(false);
  });

  it("swings once when a new notification arrives, and stops when the swing ends", () => {
    const { result, rerender } = renderHook(({ count }) => useBellSwing("Tutor Portal", count), { initialProps: { count: 1 as number | undefined } });
    rerender({ count: 2 });
    expect(result.current.swinging).toBe(true);
    act(() => result.current.stop());
    expect(result.current.swinging).toBe(false);
  });

  it("does not swing when notifications are read", () => {
    const { result, rerender } = renderHook(({ count }) => useBellSwing("Tutor Portal", count), { initialProps: { count: 4 as number | undefined } });
    rerender({ count: 0 });
    expect(result.current.swinging).toBe(false);
  });

  it("does not ring again on the next page for a notice it already announced", () => {
    const first = renderHook(({ count }) => useBellSwing("Guardian Portal", count), { initialProps: { count: 1 as number | undefined } });
    first.rerender({ count: 2 });
    first.unmount();
    // The header mounts afresh on another page with the same count.
    const next = renderHook(() => useBellSwing("Guardian Portal", 2));
    expect(next.result.current.swinging).toBe(false);
  });

  it("keeps each panel's count apart", () => {
    renderHook(() => useBellSwing("Tutor Portal", 5));
    const guardian = renderHook(({ count }) => useBellSwing("Guardian Portal", count), { initialProps: { count: 1 as number | undefined } });
    guardian.rerender({ count: 2 });
    expect(guardian.result.current.swinging).toBe(true);
  });
});
