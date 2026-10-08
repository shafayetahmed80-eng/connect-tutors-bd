import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type Merged = { title: string; body: string; url: string | null; count: number; lines: string[] };
type Incoming = { title: string; body: string; url?: string; line?: string; groupTitle?: string; groupUrl?: string };
type Previous = { count?: number; lines?: string[] } | undefined;

/** The service worker is a plain script; this runs it with a stub `self` and takes the two helpers it hands out for tests. */
function loadServiceWorker() {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, "../../public/push-sw.js"), "utf-8");
  const listeners: Record<string, unknown> = {};
  const module = { exports: {} as { mergeIntoOne: (previous: Previous, incoming: Incoming) => Merged; toBengaliDigits: (n: number) => string } };
  vm.runInNewContext(source, { self: { addEventListener: (name: string, handler: unknown) => { listeners[name] = handler; } }, module });
  return { ...module.exports, listeners };
}

const { mergeIntoOne, toBengaliDigits, listeners } = loadServiceWorker();

const chat = (body: string): Incoming => ({ title: "অ্যাডমিনের মেসেজ", body, url: "/tutor/dashboard/chat", line: body, groupTitle: "অ্যাডমিনের {n}টি মেসেজ", groupUrl: "/tutor/dashboard/chat" });

describe("the push service worker", () => {
  it("listens for pushes and for taps on a notification", () => {
    expect(typeof listeners.push).toBe("function");
    expect(typeof listeners.notificationclick).toBe("function");
  });
});

describe("stacking notifications into one", () => {
  it("shows the first one just as it came", () => {
    expect(mergeIntoOne(undefined, chat("hello"))).toEqual({ title: "অ্যাডমিনের মেসেজ", body: "hello", url: "/tutor/dashboard/chat", count: 1, lines: ["hello"] });
  });

  it("counts up in Bangla digits and lists the messages, newest last", () => {
    const first = mergeIntoOne(undefined, chat("প্রথম"));
    const second = mergeIntoOne(first, chat("দ্বিতীয়"));
    const third = mergeIntoOne(second, chat("তৃতীয়"));

    expect(third).toMatchObject({ title: "অ্যাডমিনের ৩টি মেসেজ", body: "প্রথম\nদ্বিতীয়\nতৃতীয়", count: 3 });
  });

  it("keeps the last five lines, but the count keeps going", () => {
    let state: Merged | undefined;
    for (let i = 1; i <= 8; i += 1) state = mergeIntoOne(state, chat(`message ${i}`));

    expect(state?.count).toBe(8);
    expect(state?.title).toBe("অ্যাডমিনের ৮টি মেসেজ");
    expect(state?.lines).toEqual(["message 4", "message 5", "message 6", "message 7", "message 8"]);
  });

  it("shows a line once even if it came three times, and still counts three", () => {
    let state: Merged | undefined;
    for (let i = 0; i < 3; i += 1) state = mergeIntoOne(state, chat("hello"));

    expect(state).toMatchObject({ title: "অ্যাডমিনের ৩টি মেসেজ", body: "hello", count: 3 });
  });

  it("opens the list, not the first item, once there is more than one", () => {
    const tuition = (job: string): Incoming => ({ title: "নতুন টিউশন জব", body: "আপনার প্রেফারেন্স অনুযায়ী নতুন টিউশন পোস্ট হয়েছে।", url: `/tutor/dashboard/jobs?returnTo=${job}`, groupTitle: "{n}টি নতুন টিউশন জব", groupUrl: "/tutor/dashboard/jobs" });
    const one = mergeIntoOne(undefined, tuition("6800"));
    const two = mergeIntoOne(one, tuition("6801"));

    expect(one.url).toBe("/tutor/dashboard/jobs?returnTo=6800");
    expect(two).toMatchObject({ title: "২টি নতুন টিউশন জব", url: "/tutor/dashboard/jobs", count: 2 });
  });

  it("counts in ordinary digits when the title is not Bangla", () => {
    const alert = (body: string): Incoming => ({ title: "New Admin sign-in", body, url: "/admin/security", groupTitle: "{n} Admin security alerts", groupUrl: "/admin/security" });

    expect(mergeIntoOne(mergeIntoOne(undefined, alert("a signed in")), alert("b signed in")).title).toBe("2 Admin security alerts");
  });

  it("falls back to the heading as the line, and goes on showing the single form when no stacked title is given", () => {
    expect(mergeIntoOne(undefined, { title: "শুধু শিরোনাম", body: "" }).lines).toEqual(["শুধু শিরোনাম"]);
    const plain = mergeIntoOne({ count: 1, lines: ["x"] }, { title: "A", body: "B", url: "/a" });
    expect(plain).toMatchObject({ title: "A", body: "B", url: "/a", count: 2 });
  });

  it("writes numbers in Bangla digits", () => {
    expect(toBengaliDigits(0)).toBe("০");
    expect(toBengaliDigits(12)).toBe("১২");
    expect(toBengaliDigits(305)).toBe("৩০৫");
  });
});
