import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(baseUrl, { waitUntil: "networkidle" });
const toggle = page.getByRole("button", { name: "Open menu" });
if (!(await toggle.isVisible())) throw new Error("Mobile menu trigger is not visible");

await toggle.focus();
if (!(await toggle.evaluate((element) => document.activeElement === element))) {
  throw new Error("Mobile menu trigger did not receive focus");
}
const focusStyle = await toggle.evaluate((element) => {
  const styles = getComputedStyle(element);
  return { outlineStyle: styles.outlineStyle, outlineWidth: styles.outlineWidth };
});
if (focusStyle.outlineStyle === "none" || focusStyle.outlineWidth === "0px") {
  throw new Error("Mobile menu trigger has no visible focus style");
}
await page.keyboard.press("Enter");
await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor();
const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
const mobileLabels = ["Home", "Job Board", "Blog", "Become a Tutor", "Sign In"];
for (const label of mobileLabels) {
  const link = mobileNav.getByRole("link", { name: label, exact: true });
  if (!(await link.isVisible())) throw new Error(`Opened mobile menu does not show ${label}`);
  const box = await link.boundingBox();
  if (!box || box.x < 0 || box.y < 0 || box.x + box.width > 390 || box.y + box.height > 844) {
    throw new Error(`Mobile menu item is clipped: ${label}`);
  }
}
await page.screenshot({ path: "artifacts/header-mobile-open.png", fullPage: false });

const closeButton = page.getByRole("button", { name: "Close menu" });
await closeButton.focus();
await page.keyboard.press("Space");
if (await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible()) {
  throw new Error("Space did not close the mobile menu");
}

await page.setViewportSize({ width: 1364, height: 768 });
await page.goto(baseUrl, { waitUntil: "networkidle" });
const links = await page.locator(".desktop-nav a").evaluateAll((items) =>
  items.map((item) => ({ text: item.textContent?.trim(), href: item.getAttribute("href") })),
);
const expected = ["Sign In", "Job Board", "Blog", "Become a Tutor"];
for (const label of expected) {
  if (!links.some((link) => link.text === label)) throw new Error(`Missing desktop header link: ${label}`);
}
const firstDesktopLink = page.locator(".desktop-nav a").first();
await firstDesktopLink.focus();
const desktopFocusStyle = await firstDesktopLink.evaluate((element) => {
  const styles = getComputedStyle(element);
  return { outlineStyle: styles.outlineStyle, outlineWidth: styles.outlineWidth };
});
if (desktopFocusStyle.outlineStyle === "none" || desktopFocusStyle.outlineWidth === "0px") {
  throw new Error("Desktop header link has no visible focus style");
}

console.log(JSON.stringify({ ok: true, mobileMenu: "Enter opens / Space closes", desktopLinks: links }, null, 2));
await browser.close();
