import { chromium } from "@playwright/test";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
try {
  await page.goto("http://nginx/control");
  await page.locator('.app-shell[data-interactive="true"]').waitFor();
  await page.keyboard.press("Shift+5");
  const sample = async () => {
    const values = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2000);
      values.push((await page.getByLabel("Map canvas frame rate").textContent())?.trim());
    }
    return values;
  };
  const withTwin = await sample();
  await page.getByRole("button", { name: /Hide 3D twin/ }).click();
  const withoutTwin = await sample();
  process.stdout.write(JSON.stringify({ withTwin, withoutTwin }) + "\n");
} finally {
  await browser.close();
}
