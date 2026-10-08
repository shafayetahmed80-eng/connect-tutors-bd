// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { REVEAL_STAGGER_LIMIT, REVEAL_STAGGER_MS, startScrollReveal } from "./scrollReveal";

type Callback = (entries: Array<Pick<IntersectionObserverEntry, "target" | "isIntersecting" | "boundingClientRect">>) => void;

/** An observer the test drives by hand, in place of one that waits for real scrolling. */
function fakeWindow({ reducedMotion = false, observer = true } = {}) {
  const watched: Element[] = [];
  const unobserved: Element[] = [];
  let callback: Callback = () => {};
  const disconnect = vi.fn();
  class FakeObserver {
    constructor(cb: Callback) { callback = cb; }
    observe(element: Element) { watched.push(element); }
    unobserve(element: Element) { unobserved.push(element); }
    disconnect() { disconnect(); }
  }
  return {
    win: {
      matchMedia: () => ({ matches: reducedMotion }) as MediaQueryList,
      ...(observer ? { IntersectionObserver: FakeObserver as unknown as typeof IntersectionObserver } : {}),
    },
    watched,
    unobserved,
    disconnect,
    report: (target: Element, isIntersecting: boolean, top = 100) => callback([{ target, isIntersecting, boundingClientRect: { top } as DOMRectReadOnly }]),
  };
}

function page() {
  const root = document.createElement("main");
  root.innerHTML = `
    <section><h2 data-reveal id="heading">Heading</h2></section>
    <div data-reveal-group id="cards"><article id="c0"></article><article id="c1"></article><span id="line" data-reveal-skip></span><article id="c2"></article></div>
  `;
  document.body.appendChild(root);
  return root;
}

afterEach(() => { document.body.innerHTML = ""; });

describe("startScrollReveal", () => {
  it("hides nothing for a visitor who asked for less motion", () => {
    const root = page();
    const env = fakeWindow({ reducedMotion: true });

    startScrollReveal(root, env.win);

    expect(root.classList.contains("reveal-ready")).toBe(false);
    expect(env.watched).toHaveLength(0);
  });

  it("hides nothing in a browser that cannot watch for scrolling", () => {
    const root = page();

    startScrollReveal(root, fakeWindow({ observer: false }).win);

    expect(root.classList.contains("reveal-ready")).toBe(false);
  });

  it("watches the marked elements and every child of a group, but not the decoration", () => {
    const root = page();
    const env = fakeWindow();

    startScrollReveal(root, env.win);

    expect(root.classList.contains("reveal-ready")).toBe(true);
    expect(env.watched.map(element => element.id).sort()).toEqual(["c0", "c1", "c2", "heading"]);
  });

  it("spaces a group's children out, one step each", () => {
    const root = page();
    startScrollReveal(root, fakeWindow().win);

    expect(root.querySelector<HTMLElement>("#c0")!.style.getPropertyValue("--reveal-delay")).toBe("0ms");
    expect(root.querySelector<HTMLElement>("#c1")!.style.getPropertyValue("--reveal-delay")).toBe(`${REVEAL_STAGGER_MS}ms`);
    expect(root.querySelector<HTMLElement>("#c2")!.style.getPropertyValue("--reveal-delay")).toBe(`${2 * REVEAL_STAGGER_MS}ms`);
  });

  it("stops adding delay after the limit, so a long row does not take seconds", () => {
    const root = document.createElement("div");
    root.innerHTML = `<div data-reveal-group>${Array.from({ length: 9 }, (_, i) => `<i id="i${i}"></i>`).join("")}</div>`;
    startScrollReveal(root, fakeWindow().win);

    expect(root.querySelector<HTMLElement>("#i8")!.style.getPropertyValue("--reveal-delay")).toBe(`${REVEAL_STAGGER_LIMIT * REVEAL_STAGGER_MS}ms`);
  });

  it("reveals an element once it comes into view, and then stops watching it", () => {
    const root = page();
    const env = fakeWindow();
    startScrollReveal(root, env.win);
    const heading = root.querySelector("#heading")!;

    env.report(heading, false, 900);
    expect(heading.hasAttribute("data-revealed")).toBe(false);

    env.report(heading, true, 400);
    expect(heading.hasAttribute("data-revealed")).toBe(true);
    expect(env.unobserved).toContain(heading);
  });

  it("reveals something already scrolled past, so it is not hidden when the visitor scrolls back up", () => {
    const root = page();
    const env = fakeWindow();
    startScrollReveal(root, env.win);
    const card = root.querySelector("#c0")!;

    env.report(card, false, -600);

    expect(card.hasAttribute("data-revealed")).toBe(true);
  });

  it("stops watching and lifts the hiding when it is undone", () => {
    const root = page();
    const env = fakeWindow();

    startScrollReveal(root, env.win)();

    expect(env.disconnect).toHaveBeenCalled();
    expect(root.classList.contains("reveal-ready")).toBe(false);
  });
});
