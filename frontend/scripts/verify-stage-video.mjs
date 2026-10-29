import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
try {
  await page.goto("file:///output/port-command-stage-backup.webm");
  const video = page.locator("video");
  await video.waitFor();
  const duration = await video.evaluate(async element => {
    if (element.readyState < 1) await new Promise(resolve => element.addEventListener("loadedmetadata", resolve, { once: true }));
    return element.duration;
  });
  if (duration < 300) throw new Error(`Backup ends early: ${duration}s`);
  for (const second of [155, 245, 270]) {
    await video.evaluate(async (element, time) => {
      element.currentTime = time;
      await new Promise(resolve => element.addEventListener("seeked", resolve, { once: true }));
    }, second);
    await page.screenshot({ path: `/output/stage-backup-${second}s.png` });
  }
  process.stdout.write(`Verified playable WebM duration ${duration.toFixed(2)} seconds\n`);
} finally {
  await browser.close();
}
