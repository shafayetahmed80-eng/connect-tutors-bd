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

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
