import { chromium } from "@playwright/test";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error" || message.type() === "warning") errors.push(`${message.type()}: ${message.text()}`); });
try {
  await page.goto("http://nginx/control");
  await page.locator('.map-panel[data-objects3d="ready"]').waitFor({ timeout: 25000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/output/map-3d-preview.png" });
  await page.mouse.move(800, 490);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/output/map-3d-zoom-preview.png" });
  await page.getByRole("textbox", { name: "Search map entities" }).fill("PM-01");
  await page.getByRole("button", { name: "PM-01", exact: true }).click();
  await page.waitForTimeout(1300);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "/output/map-3d-vehicle-preview.png" });
  const fps = await page.getByLabel("Map canvas frame rate").textContent();
  process.stdout.write(JSON.stringify({ objects: "ready", fps, errors }) + "\n");
} finally {
  await browser.close();
}
