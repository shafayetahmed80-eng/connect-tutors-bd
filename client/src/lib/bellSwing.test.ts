// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { forgetBellCountsForTests, useBellSwing, usePushBellBounce } from "./bellSwing";

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

describe("the bell's push bounce", () => {
  function stubServiceWorker() {
    const listeners = new Set<(event: MessageEvent) => void>();
    const serviceWorker = {
      addEventListener: (_type: string, listener: (event: MessageEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MessageEvent) => void) => listeners.delete(listener),
    };
    Object.defineProperty(window.navigator, "serviceWorker", { configurable: true, value: serviceWorker });
    return { emit: (data: unknown) => listeners.forEach(listener => listener({ data } as MessageEvent)) };
  }

  it("bounces on a push message, and stops when the animation ends", () => {
    const sw = stubServiceWorker();
    const { result } = renderHook(() => usePushBellBounce());
    expect(result.current.bouncing).toBe(false);
    act(() => sw.emit({ type: "push-received" }));
    expect(result.current.bouncing).toBe(true);
    act(() => result.current.stop());
    expect(result.current.bouncing).toBe(false);
  });

  it("ignores a service-worker message meant for something else", () => {
    const sw = stubServiceWorker();
    const { result } = renderHook(() => usePushBellBounce());
    act(() => sw.emit({ type: "something-else" }));
    expect(result.current.bouncing).toBe(false);
  });
});
