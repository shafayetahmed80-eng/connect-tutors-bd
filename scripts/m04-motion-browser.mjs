import { chromium } from "playwright";

const baseUrl = process.env.M04_BASE_URL || "http://127.0.0.1:3000";
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function inspectViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

  const cta = page.locator('a[href="/request-tutor"]').first();
  await cta.waitFor({ state: "visible" });
  const baseline = await cta.evaluate((element) => {
    const style = getComputedStyle(element);
    return { transition: style.transition, outline: style.outlineWidth };
  });
  assert(baseline.transition !== "all 0s ease 0s", `${name}: CTA has no transition contract`);

  await cta.focus();
  const focused = await cta.evaluate((element) => getComputedStyle(element).outlineWidth);
  assert(focused !== "0px", `${name}: CTA focus-visible outline is not visible`);

  await cta.hover();
  const hovered = await cta.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, transform: style.transform };
  });
  assert(hovered.background !== "rgba(0, 0, 0, 0)", `${name}: CTA hover state has no readable surface`);

  await page.mouse.move(0, 0);
  await page.mouse.down();
  const pressed = await cta.evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.up();
  assert(pressed !== "none", `${name}: CTA active press does not apply transform feedback`);

  await context.close();
}

async function inspectReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const motion = await page.evaluate(() => {
    const element = document.querySelector('a[href="/request-tutor"]');
    if (!element) return null;
    const style = getComputedStyle(element);
    return { transitionDuration: style.transitionDuration, animationName: style.animationName };
  });
  assert(motion, "reduced-motion: CTA was not found");
  if (motion) {
    assert(motion.transitionDuration === "0.001s" || motion.transitionDuration === "0s", `reduced-motion: transition duration was ${motion.transitionDuration}`);
    assert(motion.animationName === "none", `reduced-motion: animation remained ${motion.animationName}`);
  }
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await inspectViewport(browser, "desktop", { width: 1280, height: 720 });
  await inspectViewport(browser, "mobile", { width: 375, height: 812 });
  await inspectReducedMotion(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("M-04 browser motion regressions passed: desktop, mobile, and reduced-motion.");
