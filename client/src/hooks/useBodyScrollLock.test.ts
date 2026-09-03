// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useBodyScrollLock } from "./useBodyScrollLock";

afterEach(() => { document.body.style.overflow = ""; });

describe("useBodyScrollLock", () => {
  it("holds the page still while mounted and hands the scroll back on unmount", () => {
    const { unmount } = renderHook(() => useBodyScrollLock());

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps the page locked until the last of two stacked overlays closes", () => {
    // A location picker opening over a section modal: the inner one closing
    // must not hand the scroll back while the outer still covers the page.
    const outer = renderHook(() => useBodyScrollLock());
    const inner = renderHook(() => useBodyScrollLock());

    inner.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    outer.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores whatever the page had rather than assuming it was scrollable", () => {
    document.body.style.overflow = "clip";

    const { unmount } = renderHook(() => useBodyScrollLock());
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("leaves the page alone while inactive", () => {
    const { unmount } = renderHook(() => useBodyScrollLock(false));

    expect(document.body.style.overflow).toBe("");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
