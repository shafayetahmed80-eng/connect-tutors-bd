import { afterEach } from "vitest";

// Runs before every test file, in whatever environment that file declares.
//
// jsdom ships neither `ResizeObserver` nor a working `scrollIntoView`, and
// Radix's popover/select positioner (`@floating-ui`) calls both. Any component
// test that opens a Radix Popover — e.g. the Tutor Profile searchable selects —
// would otherwise throw on open. The guards make this a no-op in the default
// `node` environment, where neither global exists.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// A test that types into a search box leaves "recent searches" in storage, and the next
// test in the same file would meet them as suggestions. Start every test with none.
if (typeof window !== "undefined") {
  afterEach(() => { try { window.localStorage.clear(); } catch { /* no storage in this environment */ } });
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
