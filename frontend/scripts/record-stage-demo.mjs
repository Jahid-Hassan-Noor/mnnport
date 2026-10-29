import { chromium } from "@playwright/test";
import { rename } from "node:fs/promises";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1,
  recordVideo: { dir: "/output", size: { width: 1366, height: 768 } },
});
const page = await context.newPage();

try {
  await page.goto("http://nginx/control");
  await page.locator('.app-shell[data-interactive="true"]').waitFor();
  await page.locator(".map-panel[data-zoom]").waitFor();
  await page.keyboard.press("d");
  await page.getByRole("button", { name: "Run Stage Demo · 5 minutes" }).click();

  await page.locator(".status-strip").getByText("SCENE 2 / 6").waitFor({ timeout: 75000 });
  await page.getByRole("textbox", { name: "Search map entities" }).fill("Orient Gale");
  await page.getByRole("button", { name: "MV Orient Gale" }).click();
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape");

  await page.locator(".status-strip").getByText("SCENE 3 / 6").waitFor({ timeout: 55000 });
  await page.waitForTimeout(13000);

  await page.locator(".status-strip").getByText("SCENE 4 / 6").waitFor({ timeout: 55000 });
  await page.getByRole("button", { name: "Ask Port Command Grounded in simulated state" }).click();
  await page.locator(".suggestions").getByRole("button", { name: "Who is in a crane exclusion zone?" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape");

  await page.locator(".status-strip").getByText("SCENE 5 / 6").waitFor({ timeout: 55000 });
  await page.getByRole("button", { name: "Ask Port Command Grounded in simulated state" }).click();
  await page.locator(".suggestions").getByRole("button", { name: "Why is Berth 2 behind schedule?" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape");

  await page.locator(".status-strip").getByText("SCENE 6 / 6").waitFor({ timeout: 55000 });
  await page.getByRole("button", { name: /Port of Tanjung Pelepas/ }).click();
  await page.waitForTimeout(5000);
  await page.locator(".status-strip").getByText("SCENE 6 / 6").waitFor();
  await page.getByRole("button", { name: "Play simulation" }).waitFor({ timeout: 75000 });
  await page.waitForTimeout(3000);
} finally {
  const video = page.video();
  await context.close();
  if (video) await rename(await video.path(), "/output/port-command-stage-backup.webm");
  await browser.close();
}
