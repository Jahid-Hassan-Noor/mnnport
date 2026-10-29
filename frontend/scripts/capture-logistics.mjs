import { chromium } from "@playwright/test";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => {
  if (message.type() === "error" || message.type() === "warning") errors.push(`${message.type()}: ${message.text()}`);
});
try {
  await page.goto("http://nginx/control");
  await page.locator('.map-panel[data-objects3d="ready"]').waitFor({ timeout: 25000 });
  const search = page.getByRole("textbox", { name: "Search map entities" });

  await page.waitForTimeout(750);
  await page.screenshot({ path: "/output/map-larger-overview.png" });
  await page.getByRole("button", { name: "View container yard" }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/output/map-larger-yard.png" });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.waitForTimeout(900);

  await search.fill("PM-01");
  await page.getByRole("button", { name: "PM-01", exact: true }).click();
  await page.getByRole("complementary", { name: "vehicle inspector" }).getByText("CARRYING CONTAINER · SIMULATED").waitFor();
  await page.waitForFunction(() => Number(document.querySelector(".map-panel")?.getAttribute("data-zoom")) >= 19.3, null, { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/output/truck-with-container.png" });

  await page.keyboard.press("Escape");
  await search.fill("PM-02");
  await page.getByRole("button", { name: "PM-02", exact: true }).click();
  await page.getByRole("complementary", { name: "vehicle inspector" }).getByText("Empty", { exact: true }).waitFor();
  await page.waitForFunction(() => Number(document.querySelector(".map-panel")?.getAttribute("data-zoom")) >= 19.3, null, { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/output/empty-truck.png" });

  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Demo role" }).selectOption("supervisor");
  await search.fill("W-001");
  await page.getByRole("button", { name: "W-001", exact: true }).click();
  await page.getByRole("complementary", { name: "worker inspector" }).getByText("GPS-W-001").waitFor();
  await page.waitForTimeout(750);
  await page.screenshot({ path: "/output/worker-gps.png" });

  const compactPage = await browser.newPage({ viewport: { width: 662, height: 827 } });
  compactPage.on("pageerror", error => errors.push(error.message));
  await compactPage.goto("http://nginx/control");
  await compactPage.locator('.map-panel[data-objects3d="ready"]').waitFor({ timeout: 25000 });
  await compactPage.screenshot({ path: "/output/map-compact-large.png" });
  await compactPage.close();

  process.stdout.write(JSON.stringify({ errors }) + "\n");
} finally {
  await browser.close();
}
