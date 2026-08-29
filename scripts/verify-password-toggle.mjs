import { chromium } from "playwright";

const baseUrl = "https://3000-iloqq7j81ie24n4gz8k62-fe175cf6.us4.manus.computer";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

async function verify(path, passwordLabel, expectedButtons) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  const buttons = page.getByRole("button", { name: /show .*password/i });
  if (await buttons.count() !== expectedButtons) {
    throw new Error(`${path}: expected ${expectedButtons} show-password buttons, found ${await buttons.count()}`);
  }
  const passwordInput = page.locator(path === "/become-tutor" ? 'input[autocomplete="new-password"]' : 'input[autocomplete="current-password"]').first();
  await passwordInput.fill("secret123");
  await page.keyboard.press("Tab");
  const focusedLabel = await page.locator(":focus").getAttribute("aria-label");
  if (!focusedLabel?.toLowerCase().includes("show")) {
    throw new Error(`${path}: Tab did not reach a show-password button; focused label was ${focusedLabel}`);
  }
  await page.keyboard.press("Enter");
  if (await passwordInput.getAttribute("type") !== "text") {
    throw new Error(`${path}: Enter did not reveal the password input`);
  }
  await page.keyboard.press("Enter");
  if (await passwordInput.getAttribute("type") !== "password") {
    throw new Error(`${path}: Enter did not hide the password input`);
  }
  console.log(`${path}: keyboard toggle verified (${passwordLabel})`);
}

await verify("/become-tutor", "registration password", 2);
await verify("/tutor/login", "login password", 1);
await browser.close();
