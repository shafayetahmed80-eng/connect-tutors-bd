// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsApp } from "./useIsApp";

describe("useIsApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    // Default window.location.search
    delete (window as unknown as { location?: unknown }).location;
    window.location = new URL("https://connecttutorsbd.com/") as unknown as Location;
    Object.defineProperty(document, "referrer", {
      value: "",
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns false in a standard browser tab", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsApp());
    expect(result.current).toBe(false);
  });

  it("returns true when ct_is_android_app is cached in localStorage", () => {
    window.localStorage.setItem("ct_is_android_app", "true");

    const { result } = renderHook(() => useIsApp());
    expect(result.current).toBe(true);
  });

  it("detects android_app platform query parameter and caches it", () => {
    delete (window as unknown as { location?: unknown }).location;
    window.location = new URL("https://connecttutorsbd.com/?platform=android_app") as unknown as Location;

    const { result } = renderHook(() => useIsApp());
    expect(result.current).toBe(true);
    expect(window.localStorage.getItem("ct_is_android_app")).toBe("true");
  });

  it("detects android-app:// referrer and caches it", () => {
    Object.defineProperty(document, "referrer", {
      value: "android-app://com.connecttutorsbd.app",
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useIsApp());
    expect(result.current).toBe(true);
    expect(window.localStorage.getItem("ct_is_android_app")).toBe("true");
  });

  it("detects display-mode: standalone media query and caches it", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsApp());
    expect(result.current).toBe(true);
    expect(window.localStorage.getItem("ct_is_android_app")).toBe("true");
  });

  it("detects navigator.standalone property (iOS / standalone)", () => {
    Object.defineProperty(window.navigator, "standalone", {
      value: true,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useIsApp());
    expect(result.current).toBe(true);
    expect(window.localStorage.getItem("ct_is_android_app")).toBe("true");
  });
});
